# =============================================================================
# Terraform Outputs
# =============================================================================

output "vpc_id" {
  description = "GroupDrive VPC ID"
  value       = aws_vpc.main.id
}

output "alb_dns_name" {
  description = "Public Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "cloudfront_domain_name" {
  description = "CloudFront CDN domain name for vehicle catalog media"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket_name" {
  description = "S3 bucket for document & vehicle photo storage"
  value       = aws_s3_bucket.assets.id
}

output "rds_endpoint" {
  description = "PostgreSQL 16 connection address (private)"
  value       = aws_db_instance.postgres.address
}

output "elasticache_redis_endpoint" {
  description = "ElastiCache Redis primary connection address (private)"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "database_secret_arn" {
  description = "AWS Secrets Manager ARN storing database master credentials"
  value       = aws_secretsmanager_secret.db_credentials.arn
}
