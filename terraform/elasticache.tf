# =============================================================================
# ElastiCache Redis Cluster (Multi-AZ & In-Transit Encryption)
# =============================================================================

resource "aws_elasticache_subnet_group" "redis" {
  name       = "groupdrive-${var.environment}-redis-subnets"
  subnet_ids = aws_subnet.database[*].id
}

resource "aws_security_group" "redis" {
  name        = "groupdrive-${var.environment}-redis-sg"
  description = "Permit inbound Redis traffic from ECS private subnets"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Redis port from ECS"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "groupdrive-${var.environment}-redis-sg"
  }
}

resource "random_password" "redis_auth_token" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "redis_token" {
  name                    = "groupdrive/${var.environment}/redis"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "redis_token" {
  secret_id = aws_secretsmanager_secret.redis_token.id
  secret_string = jsonencode({
    auth_token = random_password.redis_auth_token.result
    endpoint   = aws_elasticache_replication_group.redis.primary_endpoint_address
    port       = 6379
  })
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "groupdrive-${var.environment}-redis"
  description                = "GroupDrive BullMQ and rate limiting cluster"
  node_type                  = var.redis_node_type
  num_cache_clusters         = var.environment == "production" ? 2 : 1
  parameter_group_name       = "default.redis7"
  port                       = 6379
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  automatic_failover_enabled = var.environment == "production" ? true : false
  multi_az_enabled           = var.environment == "production" ? true : false

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = random_password.redis_auth_token.result

  snapshot_retention_limit = 7
  snapshot_window          = "19:00-20:00"

  tags = {
    Name = "groupdrive-${var.environment}-redis"
  }
}
