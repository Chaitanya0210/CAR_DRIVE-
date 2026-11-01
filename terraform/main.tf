# =============================================================================
# GroupDrive AWS-Lite Production Infrastructure — Terraform Root
# Region: ap-south-1 (Asia Pacific - Mumbai)
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Production remote state (uncomment for production deployment)
  # backend "s3" {
  #   bucket         = "groupdrive-tf-state-mumbai"
  #   key            = "production/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "groupdrive-tf-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GroupDrive"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Region      = var.aws_region
    }
  }
}
