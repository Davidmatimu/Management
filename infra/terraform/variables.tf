variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used to prefix/tag all resources"
  type        = string
  default     = "tms"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Root domain for the app (e.g. tms.example.com). Must already be a Route53 hosted zone in this account - see docs/AWS-DEPLOYMENT.md."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.60.0.0/16"
}

variable "availability_zone_count" {
  description = "Number of AZs to spread subnets across"
  type        = number
  default     = 2
}

variable "single_nat_gateway" {
  description = "Use one NAT gateway instead of one per AZ. Cheaper, less HA - fine for a first deployment."
  type        = bool
  default     = true
}

variable "cluster_version" {
  description = "EKS Kubernetes version - check the AWS docs for the current default/recommended version before applying"
  type        = string
  default     = "1.30"
}

variable "node_instance_types" {
  description = "Instance types for the managed EKS node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "node_desired_size" {
  type    = number
  default = 2
}

variable "node_min_size" {
  type    = number
  default = 2
}

variable "node_max_size" {
  type    = number
  default = 4
}

variable "db_instance_class" {
  description = "RDS instance class - db.t4g.micro is Free Tier eligible for a new AWS account's first 12 months"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "postgres_version" {
  type    = string
  default = "16.4"
}

variable "app_db_name" {
  type    = string
  default = "tms"
}

variable "app_db_username" {
  type    = string
  default = "tms"
}

variable "keycloak_db_name" {
  type    = string
  default = "keycloak"
}

variable "keycloak_db_username" {
  type    = string
  default = "keycloak"
}
