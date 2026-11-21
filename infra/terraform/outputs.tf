output "domain_name" {
  value = var.domain_name
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "app_db_endpoint" {
  value     = aws_db_instance.app.address
  sensitive = true
}

output "keycloak_db_endpoint" {
  value     = aws_db_instance.keycloak.address
  sensitive = true
}

output "app_db_secret_arn" {
  value = aws_secretsmanager_secret.app_db.arn
}

output "keycloak_db_secret_arn" {
  value = aws_secretsmanager_secret.keycloak_db.arn
}

output "app_secrets_arn" {
  value = aws_secretsmanager_secret.app_secrets.arn
}

output "keycloak_admin_secret_arn" {
  value = aws_secretsmanager_secret.keycloak_admin.arn
}

output "anthropic_secret_arn" {
  value = aws_secretsmanager_secret.anthropic.arn
}

output "acm_certificate_arn" {
  value = aws_acm_certificate_validation.main.certificate_arn
}

output "route53_zone_id" {
  value = data.aws_route53_zone.main.zone_id
}

output "vpc_id" {
  value = module.vpc.vpc_id
}
