# =============================================================================
# RDS PostgreSQL 16 Multi-AZ with PostGIS
# =============================================================================

resource "aws_db_subnet_group" "rds" {
  name       = "groupdrive-${var.environment}-db-subnet-group"
  subnet_ids = aws_subnet.database[*].id

  tags = {
    Name = "groupdrive-${var.environment}-db-subnets"
  }
}

# Security Group for Database (Restricted to ECS private subnets only)
resource "aws_security_group" "rds" {
  name        = "groupdrive-${var.environment}-rds-sg"
  description = "Permit inbound PostgreSQL traffic from ECS private subnets"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL port from ECS Private Subnets"
    from_port       = 5432
    to_port         = 5432
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
    Name = "groupdrive-${var.environment}-rds-sg"
  }
}

# Random Master Password
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store Master Password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name                    = "groupdrive/${var.environment}/database"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = "postgres"
    host     = aws_db_instance.postgres.address
    port     = 5432
    username = var.db_username
    password = random_password.db_password.result
    database = var.db_name
  })
}

# Parameter group enabling PostGIS and performance parameters
resource "aws_db_parameter_group" "postgres16" {
  name   = "groupdrive-${var.environment}-pg16-params"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

# Managed Multi-AZ PostgreSQL 16 RDS Instance
resource "aws_db_instance" "postgres" {
  identifier                  = "groupdrive-${var.environment}-postgres"
  engine                      = "postgres"
  engine_version              = "16.3"
  instance_class              = var.db_instance_class
  allocated_storage           = var.db_allocated_storage_gb
  max_allocated_storage       = 200 # Storage auto-scaling
  storage_type                = "gp3"
  storage_encrypted           = true
  multi_az                    = var.environment == "production" ? true : false
  publicly_accessible         = false
  db_subnet_group_name        = aws_db_subnet_group.rds.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  parameter_group_name        = aws_db_parameter_group.postgres16.name
  auto_minor_version_upgrade  = true
  allow_major_version_upgrade = false

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  backup_retention_period   = 14
  backup_window             = "18:00-19:00" # 11:30 PM - 12:30 AM IST
  maintenance_window        = "Sun:19:00-Sun:20:00"
  copy_tags_to_snapshot     = true
  deletion_protection       = var.environment == "production" ? true : false
  skip_final_snapshot       = var.environment == "production" ? false : true
  final_snapshot_identifier = "groupdrive-${var.environment}-final-snapshot"

  tags = {
    Name = "groupdrive-${var.environment}-rds"
  }
}
