# Two small RDS instances rather than one shared one: separates Keycloak's
# lifecycle/backups from the app's, and keeps this simple to reason about.
# Consolidate later if the extra ~$13/mo isn't worth it for your use case.

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "Allow Postgres from EKS nodes only"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "Postgres from EKS nodes"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.node_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = module.vpc.private_subnets
}

resource "random_password" "app_db" {
  length  = 24
  special = false
}

resource "random_password" "keycloak_db" {
  length  = 24
  special = false
}

resource "aws_db_instance" "app" {
  identifier     = "${var.project_name}-app-db"
  engine         = "postgres"
  engine_version = var.postgres_version

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.app_db_name
  username = var.app_db_username
  password = random_password.app_db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-app-db-final"
  deletion_protection       = true

  publicly_accessible = false
}

resource "aws_db_instance" "keycloak" {
  identifier     = "${var.project_name}-keycloak-db"
  engine         = "postgres"
  engine_version = var.postgres_version

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.keycloak_db_name
  username = var.keycloak_db_username
  password = random_password.keycloak_db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period   = 7
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project_name}-keycloak-db-final"
  deletion_protection       = true

  publicly_accessible = false
}

# ─── Secrets ─────────────────────────────────────────────────────────────
# Generated here rather than passed via tfvars so nothing sensitive lives in
# a .tfvars file. Pull these into K8s Secrets at deploy time - see
# docs/AWS-DEPLOYMENT.md step 6.

resource "aws_secretsmanager_secret" "app_db" {
  name = "${var.project_name}/app-db"
}

resource "aws_secretsmanager_secret_version" "app_db" {
  secret_id = aws_secretsmanager_secret.app_db.id
  secret_string = jsonencode({
    host     = aws_db_instance.app.address
    port     = aws_db_instance.app.port
    dbname   = var.app_db_name
    username = var.app_db_username
    password = random_password.app_db.result
  })
}

resource "aws_secretsmanager_secret" "keycloak_db" {
  name = "${var.project_name}/keycloak-db"
}

resource "aws_secretsmanager_secret_version" "keycloak_db" {
  secret_id = aws_secretsmanager_secret.keycloak_db.id
  secret_string = jsonencode({
    host     = aws_db_instance.keycloak.address
    port     = aws_db_instance.keycloak.port
    dbname   = var.keycloak_db_name
    username = var.keycloak_db_username
    password = random_password.keycloak_db.result
  })
}

resource "random_password" "session_secret" {
  length  = 48
  special = false
}

resource "random_password" "keycloak_client_secret" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "app_secrets" {
  name = "${var.project_name}/app-secrets"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    sessionSecret        = random_password.session_secret.result
    keycloakClientSecret = random_password.keycloak_client_secret.result
  })
}

# Optional - the AI-assist endpoints (draft objective, suggest SF-182 codes)
# need a real Anthropic API key, which Terraform can't generate. This just
# creates the empty container; populate it by hand once you have a key:
#   aws secretsmanager put-secret-value \
#     --secret-id "$(terraform output -raw anthropic_secret_arn)" \
#     --secret-string '{"apiKey":"sk-ant-..."}'
# Leave it empty and the backend runs fine with AI-assist disabled (503).
resource "aws_secretsmanager_secret" "anthropic" {
  name = "${var.project_name}/anthropic"
}

resource "random_password" "keycloak_admin" {
  length  = 20
  special = false
}

resource "aws_secretsmanager_secret" "keycloak_admin" {
  name = "${var.project_name}/keycloak-admin"
}

resource "aws_secretsmanager_secret_version" "keycloak_admin" {
  secret_id = aws_secretsmanager_secret.keycloak_admin.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.keycloak_admin.result
  })
}
