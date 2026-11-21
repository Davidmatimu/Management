# Deploying TMS to AWS (EKS)

Everything needed to run this app on AWS lives in `infra/terraform`
(the cloud infrastructure), `infra/k8s` (the Kubernetes manifests),
`backend/Dockerfile` / `frontend/Dockerfile` (the container images), and
`.github/workflows/deploy.yml` (ongoing CI/CD). This doc walks through
using them, in order, for a first deployment.

**Nothing here has been run against a real AWS account** - it's been
validated locally (`terraform validate`, `terraform fmt`, `kubeconform`
against the K8s 1.30 schema, and both Docker images built + smoke-tested),
but provisioning real infrastructure, DNS, and money is a step only you can
authorize.

## What this builds

- A VPC with public/private subnets across 2 AZs, one NAT gateway
- An EKS cluster (managed node group, 2-4 `t3.medium` nodes)
- Two RDS Postgres instances (`db.t4g.micro`) - one for the app, one for Keycloak
- Two ECR repos for the backend/frontend images
- The AWS Load Balancer Controller (so a K8s `Ingress` provisions a real ALB)
- An ACM certificate for `*.yourdomain.com`, DNS-validated via Route53
- A GitHub Actions OIDC role, so CI/CD doesn't need long-lived AWS keys
- Backend + frontend + Keycloak running as Deployments behind that ALB,
  with autoscaling (backend/frontend) and pod disruption budgets

**Estimated cost**: roughly $220-260/month steady-state (EKS control plane
~$73, 2x `t3.medium` nodes ~$60, 2x NAT-less-if-single ~$32, 2x RDS
`db.t4g.micro` ~$26, ALB ~$20, data transfer/misc ~$20-40). The db.t4g.micro
tier is free for a new account's first 12 months, which changes the math
substantially. Run `terraform plan` and check the AWS Pricing Calculator
before applying if this needs to be tighter.

## Prerequisites

- An AWS account, with the domain you want to use already a **Route53
  public hosted zone** in that account (transfer or create it there first -
  ACM/DNS validation in `infra/terraform/dns.tf` assumes this)
- Tools: `aws` CLI (configured, `aws sts get-caller-identity` works),
  `terraform` >= 1.6, `kubectl`, `docker`, `jq`
- A GitHub repo for this code (for step 8's CI/CD role)

## 1. Terraform remote state (recommended before a real deploy)

Local state is fine solo, but the moment a second person or CI touches this,
you want state in S3 with locking:

```bash
aws s3 mb s3://tms-terraform-state --region us-east-1
aws s3api put-bucket-versioning --bucket tms-terraform-state --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name tms-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Then uncomment the `backend "s3"` block in `infra/terraform/versions.tf` and
run `terraform init -migrate-state`.

## 2. Configure variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars: domain_name, github_repository, instance sizes
```

## 3. Provision the infrastructure

```bash
terraform init
terraform plan   # read it - this creates real, billable resources
terraform apply
```

This takes 15-20 minutes (EKS cluster creation is the slow part). When it's
done, keep the terminal - you'll need several `terraform output` values
below.

## 4. Point kubectl at the new cluster

```bash
$(terraform output -raw configure_kubectl)
kubectl get nodes   # should show 2 nodes, Ready
```

## 5. Build and push the images (first time, manually)

CI/CD (step 8) handles this on every push after today, but the cluster
needs *something* running before you can wire that up:

```bash
cd ../..   # repo root
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "$(cd infra/terraform && terraform output -raw ecr_backend_url | cut -d/ -f1)"

docker build -t "$(cd infra/terraform && terraform output -raw ecr_backend_url):v1" backend
docker push "$(cd infra/terraform && terraform output -raw ecr_backend_url):v1"

DOMAIN=$(cd infra/terraform && terraform output -raw domain_name)
docker build \
  --build-arg REACT_APP_API_URL="https://api.$DOMAIN" \
  --build-arg REACT_APP_KEYCLOAK_URL="https://auth.$DOMAIN" \
  -t "$(cd infra/terraform && terraform output -raw ecr_frontend_url):v1" frontend
docker push "$(cd infra/terraform && terraform output -raw ecr_frontend_url):v1"
```

(`scripts/deploy.sh` does this same build/push, plus everything in steps 7-9,
in one command - see the end of this doc.)

## 6. Create the K8s Secrets

Nothing sensitive is checked in - `infra/k8s/backend/secret.example.yaml` and
`infra/k8s/keycloak/secret.example.yaml` are templates only. Pull the real
values Terraform generated out of Secrets Manager:

```bash
kubectl apply -f infra/k8s/00-namespace.yaml

cd infra/terraform
APP_DB=$(aws secretsmanager get-secret-value --secret-id "$(terraform output -raw app_db_secret_arn)" --query SecretString --output text)
kubectl create secret generic tms-app-db -n tms \
  --from-literal=DB_HOST="$(echo "$APP_DB" | jq -r .host)" \
  --from-literal=DB_PORT="$(echo "$APP_DB" | jq -r .port)" \
  --from-literal=DB_USERNAME="$(echo "$APP_DB" | jq -r .username)" \
  --from-literal=DB_PASSWORD="$(echo "$APP_DB" | jq -r .password)" \
  --from-literal=DB_NAME="$(echo "$APP_DB" | jq -r .dbname)"

APP_SECRETS=$(aws secretsmanager get-secret-value --secret-id "$(terraform output -raw app_secrets_arn)" --query SecretString --output text)
# Optional - AI-assist (draft objective / suggest SF-182 codes) is disabled until you've
# populated infra/terraform's "anthropic" secret with a real key (see rds.tf for the
# put-secret-value command). Falls back to an empty string if you haven't set one yet.
ANTHROPIC_KEY=$(aws secretsmanager get-secret-value --secret-id "$(terraform output -raw anthropic_secret_arn)" --query SecretString --output text 2>/dev/null | jq -r '.apiKey // ""')
kubectl create secret generic tms-app-secrets -n tms \
  --from-literal=SESSION_SECRET="$(echo "$APP_SECRETS" | jq -r .sessionSecret)" \
  --from-literal=KEYCLOAK_CLIENT_SECRET="$(echo "$APP_SECRETS" | jq -r .keycloakClientSecret)" \
  --from-literal=ANTHROPIC_API_KEY="$ANTHROPIC_KEY"

KC_DB=$(aws secretsmanager get-secret-value --secret-id "$(terraform output -raw keycloak_db_secret_arn)" --query SecretString --output text)
kubectl create secret generic tms-keycloak-db -n tms \
  --from-literal=KC_DB_URL_HOST="$(echo "$KC_DB" | jq -r .host)" \
  --from-literal=KC_DB_URL_PORT="$(echo "$KC_DB" | jq -r .port)" \
  --from-literal=KC_DB_URL_DATABASE="$(echo "$KC_DB" | jq -r .dbname)" \
  --from-literal=KC_DB_USERNAME="$(echo "$KC_DB" | jq -r .username)" \
  --from-literal=KC_DB_PASSWORD="$(echo "$KC_DB" | jq -r .password)"

KC_ADMIN=$(aws secretsmanager get-secret-value --secret-id "$(terraform output -raw keycloak_admin_secret_arn)" --query SecretString --output text)
kubectl create secret generic tms-keycloak-admin -n tms \
  --from-literal=KEYCLOAK_ADMIN="$(echo "$KC_ADMIN" | jq -r .username)" \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD="$(echo "$KC_ADMIN" | jq -r .password)"
```

## 7. Create the Keycloak realm-import ConfigMap

`infra/k8s/keycloak/realm-export-prod.json` is deliberately **not** the same
file as `keycloak/realm-export.json` used for local dev - it has no seeded
test users/passwords (`Passw0rd!`, `admin`/`admin` have no business existing
in production). Substitute the placeholders and load it:

```bash
DOMAIN=$(cd infra/terraform && terraform output -raw domain_name)
KC_SECRET=$(cd infra/terraform && aws secretsmanager get-secret-value --secret-id "$(terraform output -raw app_secrets_arn)" --query SecretString --output text | jq -r .keycloakClientSecret)

sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__KEYCLOAK_CLIENT_SECRET__#$KC_SECRET#g" \
  infra/k8s/keycloak/realm-export-prod.json > /tmp/realm-export-prod.json

kubectl create configmap tms-realm-import -n tms --from-file=realm-export.json=/tmp/realm-export-prod.json
```

## 8. Render and apply the remaining manifests

The manifests use `__DOMAIN__`, `__ACM_CERTIFICATE_ARN__`,
`__ECR_BACKEND_URL__` / `__ECR_FRONTEND_URL__`, `__TAG__` placeholders.
Either run `scripts/deploy.sh` (does this + the image build/push from step 5
+ this apply, in one shot - safe to re-run), or by hand:

```bash
cd infra/terraform
DOMAIN=$(terraform output -raw domain_name)
ACM_ARN=$(terraform output -raw acm_certificate_arn)
ECR_BACKEND=$(terraform output -raw ecr_backend_url)
ECR_FRONTEND=$(terraform output -raw ecr_frontend_url)
cd ../..

sed -e "s#__DOMAIN__#$DOMAIN#g" infra/k8s/backend/configmap.yaml | kubectl apply -f -
sed -e "s#__ECR_BACKEND_URL__#$ECR_BACKEND#g" -e "s#__TAG__#v1#g" infra/k8s/backend/deployment.yaml | kubectl apply -f -
sed -e "s#__ECR_FRONTEND_URL__#$ECR_FRONTEND#g" -e "s#__TAG__#v1#g" infra/k8s/frontend/deployment.yaml | kubectl apply -f -
sed -e "s#__DOMAIN__#$DOMAIN#g" infra/k8s/keycloak/deployment.yaml | kubectl apply -f -
sed -e "s#__DOMAIN__#$DOMAIN#g" -e "s#__ACM_CERTIFICATE_ARN__#$ACM_ARN#g" infra/k8s/ingress.yaml | kubectl apply -f -

kubectl rollout status deployment/tms-backend -n tms
kubectl rollout status deployment/tms-frontend -n tms
kubectl rollout status deployment/tms-keycloak -n tms
```

## 9. Point DNS at the ALB

The ALB doesn't exist until the `Ingress` above creates it, so this step is
necessarily manual/after-the-fact:

```bash
kubectl get ingress tms-ingress -n tms
# note the ADDRESS column - something like k8s-tms-xxxx.us-east-1.elb.amazonaws.com

ZONE_ID=$(cd infra/terraform && terraform output -raw route53_zone_id)
ALB_HOST="<paste the ADDRESS from above>"

for sub in app api auth; do
  aws route53 change-resource-record-sets --hosted-zone-id "$ZONE_ID" --change-batch '{
    "Changes": [{"Action": "UPSERT", "ResourceRecordSet": {
      "Name": "'"$sub.$DOMAIN"'", "Type": "CNAME", "TTL": 60,
      "ResourceRecords": [{"Value": "'"$ALB_HOST"'"}]
    }}]
  }'
done
```

Give DNS/ACM/ALB target registration a few minutes, then check:

```bash
curl -s https://api.$DOMAIN/api/health
open https://app.$DOMAIN
```

## 10. Create real users

The production realm import has **no users** - self-registration is off by
default (`registrationAllowed: false` in `realm-export-prod.json`). Create
your first HR/AO/supervisor accounts via the Keycloak Admin Console at
`https://auth.<domain>/admin` (login: the `tms-keycloak-admin` secret from
step 6), assigning the `employee`/`supervisor`/`AO`/`HR` realm roles as
appropriate. Flip `registrationAllowed` back on in the realm settings if you
want open self-service signup instead.

## 11. Wire up CI/CD

In the GitHub repo: **Settings → Secrets and variables → Actions**

- Secret `AWS_DEPLOY_ROLE_ARN` = `terraform output -raw github_actions_role_arn`
- Variable `DOMAIN_NAME` = your domain

Every push to `main` now builds both images, pushes to ECR, and rolls the
Deployments - see `.github/workflows/deploy.yml`.

---

## Known limitations / next steps

- **Session store isn't distributed.** The backend uses an in-memory
  session store (`express-session` `MemoryStore`) required by
  `keycloak-connect`. With 2 replicas this doesn't break auth (the API is
  bearer-only - each request is validated independently), but it does mean
  memory grows unbounded per-pod over a long enough uptime and any
  session-level caching isn't shared across replicas. Fix: add Redis
  (ElastiCache) as the session store before this matters at real scale.
- **Keycloak runs as a single replica.** Real HA Keycloak needs
  `KC_CACHE_STACK=kubernetes` plus RBAC for pod discovery (JGroups) - left
  out here to keep the first deployment simpler. The RDS-backed DB means a
  pod restart doesn't lose data, which is the main thing that matters short
  of needing zero-downtime Keycloak upgrades.
- **No NetworkPolicy.** Pod-to-pod traffic is already minimal (the browser
  talks to each service independently through the ALB, not pod-to-pod), and
  RDS access is already locked to the node security group. A default-deny
  NetworkPolicy is a reasonable next hardening step if you want
  defense-in-depth beyond that.
- **CAC/PIV login** is scaffolded (`keycloak/CAC-SETUP.md`,
  `browser-cac` auth flow already in both realm exports) but not active -
  activating it needs the ALB or a proxy in front of Keycloak configured for
  mutual TLS against a DoD PKI trust bundle, which is its own project once
  you have real CAC-issued users to test with.
- **Two RDS instances** (app + Keycloak) costs a bit more than one shared
  instance with two databases. Consolidate later if you want the ~$13/mo
  back and are comfortable with their lifecycles being coupled.

## Tearing it down

```bash
kubectl delete -f infra/k8s/ingress.yaml   # delete the ALB first, or the VPC delete will hang
cd infra/terraform
terraform destroy
```

Note `deletion_protection = true` on both RDS instances (`infra/terraform/rds.tf`)
- Terraform will refuse to destroy them until you flip that to `false` and
  apply once more. That's deliberate friction against an accidental
  `destroy` wiping your data.
