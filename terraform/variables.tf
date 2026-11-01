# =============================================================================
# Terraform Input Variables
# =============================================================================

variable "aws_region" {
  description = "AWS deployment region (closest to rural Bharat user base)"
  type        = string
  default     = "ap-south-1" # Mumbai
}

variable "environment" {
  description = "Deployment target environment (staging or production)"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for the GroupDrive VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for Multi-AZ redundancy"
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]
}

# -----------------------------------------------------------------------------
# Database (RDS PostgreSQL 16)
# -----------------------------------------------------------------------------
variable "db_instance_class" {
  description = "RDS instance class (AWS Graviton3/4 recommended for price-performance)"
  type        = string
  default     = "db.t4g.medium"
}

variable "db_allocated_storage_gb" {
  description = "Allocated SSD storage in GB (gp3)"
  type        = number
  default     = 50
}

variable "db_name" {
  description = "PostgreSQL initial database name"
  type        = string
  default     = "groupdrive_prod"
}

variable "db_username" {
  description = "Master PostgreSQL username"
  type        = string
  default     = "groupdrive_admin"
}

# -----------------------------------------------------------------------------
# Cache (ElastiCache Redis)
# -----------------------------------------------------------------------------
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.t4g.micro"
}

# -----------------------------------------------------------------------------
# Compute & Containers (ECS Fargate)
# -----------------------------------------------------------------------------
variable "api_image" {
  description = "ECR container image URI for GroupDrive NestJS API"
  type        = string
  default     = "public.ecr.aws/groupdrive/api:latest"
}

variable "ai_service_image" {
  description = "ECR container image URI for GroupDrive FastAPI AI Service"
  type        = string
  default     = "public.ecr.aws/groupdrive/ai-service:latest"
}

variable "api_cpu" {
  description = "Fargate CPU units for API (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "api_memory" {
  description = "Fargate Memory (MB) for API"
  type        = number
  default     = 2048
}

variable "ai_cpu" {
  description = "Fargate CPU units for AI Service (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "ai_memory" {
  description = "Fargate Memory (MB) for AI Service"
  type        = number
  default     = 2048
}

variable "api_desired_count" {
  description = "Desired number of API Fargate tasks"
  type        = number
  default     = 2
}

variable "ai_desired_count" {
  description = "Desired number of AI Service Fargate tasks"
  type        = number
  default     = 2
}
