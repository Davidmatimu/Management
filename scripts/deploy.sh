#!/usr/bin/env bash
# Builds and pushes both images, renders the K8s manifest placeholders from
# Terraform outputs, and applies everything to the cluster. Run from the
# repo root. Requires: aws, docker, kubectl, terraform, jq - and that you've
# already run `terraform apply` in infra/terraform and created the K8s
# secrets (see docs/AWS-DEPLOYMENT.md steps 1-6) before running this.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TF_DIR="$ROOT_DIR/infra/terraform"
K8S_DIR="$ROOT_DIR/infra/k8s"
RENDER_DIR="$ROOT_DIR/infra/k8s/.rendered"

cd "$TF_DIR"
DOMAIN=$(terraform output -raw domain_name 2>/dev/null || true)
if [ -z "$DOMAIN" ]; then
  # domain_name isn't a Terraform output by default - fall back to the tfvars value
  DOMAIN=$(grep -E '^\s*domain_name' terraform.tfvars | sed -E 's/.*"(.*)".*/\1/')
fi
ECR_BACKEND=$(terraform output -raw ecr_backend_url)
ECR_FRONTEND=$(terraform output -raw ecr_frontend_url)
ACM_ARN=$(terraform output -raw acm_certificate_arn)
CLUSTER_NAME=$(terraform output -raw cluster_name)
AWS_REGION=$(aws configure get region)

echo "==> Domain: $DOMAIN"
echo "==> Cluster: $CLUSTER_NAME"

TAG=$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD 2>/dev/null || date +%s)
echo "==> Image tag: $TAG"

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_BACKEND"

echo "==> Building + pushing backend image"
docker build -t "$ECR_BACKEND:$TAG" -t "$ECR_BACKEND:latest" "$ROOT_DIR/backend"
docker push "$ECR_BACKEND:$TAG"
docker push "$ECR_BACKEND:latest"

echo "==> Building + pushing frontend image"
docker build \
  --build-arg REACT_APP_API_URL="https://api.$DOMAIN" \
  --build-arg REACT_APP_KEYCLOAK_URL="https://auth.$DOMAIN" \
  -t "$ECR_FRONTEND:$TAG" -t "$ECR_FRONTEND:latest" "$ROOT_DIR/frontend"
docker push "$ECR_FRONTEND:$TAG"
docker push "$ECR_FRONTEND:latest"

echo "==> Pointing kubectl at the cluster"
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"

echo "==> Rendering manifests with real values into $RENDER_DIR"
rm -rf "$RENDER_DIR"
cp -r "$K8S_DIR" "$RENDER_DIR"
rm -rf "$RENDER_DIR/.rendered" # avoid copying into itself on re-runs

find "$RENDER_DIR" -type f \( -name '*.yaml' -o -name '*.json' \) -print0 | xargs -0 sed -i \
  -e "s#__DOMAIN__#$DOMAIN#g" \
  -e "s#__ACM_CERTIFICATE_ARN__#$ACM_ARN#g" \
  -e "s#__ECR_BACKEND_URL__#$ECR_BACKEND#g" \
  -e "s#__ECR_FRONTEND_URL__#$ECR_FRONTEND#g" \
  -e "s#__TAG__#$TAG#g"

echo "==> Applying namespace"
kubectl apply -f "$RENDER_DIR/00-namespace.yaml"

echo "==> NOTE: this script does not create Secrets or the Keycloak realm-import"
echo "    ConfigMap - do that once, by hand, per docs/AWS-DEPLOYMENT.md steps 6-7."
echo "    Re-running this script is safe; it won't touch existing Secrets."

echo "==> Applying backend"
kubectl apply -f "$RENDER_DIR/backend/configmap.yaml"
kubectl apply -f "$RENDER_DIR/backend/deployment.yaml"

echo "==> Applying frontend"
kubectl apply -f "$RENDER_DIR/frontend/deployment.yaml"

echo "==> Applying Keycloak"
kubectl apply -f "$RENDER_DIR/keycloak/deployment.yaml"

echo "==> Applying ingress"
kubectl apply -f "$RENDER_DIR/ingress.yaml"

echo "==> Waiting for rollout"
kubectl rollout status deployment/tms-backend -n tms --timeout=180s
kubectl rollout status deployment/tms-frontend -n tms --timeout=180s
kubectl rollout status deployment/tms-keycloak -n tms --timeout=300s

echo "==> Done. Get the ALB hostname with:"
echo "    kubectl get ingress tms-ingress -n tms"
