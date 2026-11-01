# =============================================================================
# ECS Fargate Cluster, Task Definitions & Serverless Container Services
# =============================================================================

# Security Group for ECS Fargate Tasks
resource "aws_security_group" "ecs" {
  name        = "groupdrive-${var.environment}-ecs-sg"
  description = "Security group for ECS tasks in private subnets"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Inbound from Application Load Balancer"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Outbound to anywhere via NAT Gateway"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "groupdrive-${var.environment}-ecs-sg"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "groupdrive-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# IAM Execution Role (pulls images from ECR, secrets from Secrets Manager, writes CloudWatch logs)
resource "aws_iam_role" "ecs_execution" {
  name = "groupdrive-${var.environment}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# CloudWatch Log Group for API
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/groupdrive-${var.environment}-api"
  retention_in_days = 30
}

# CloudWatch Log Group for AI Service
resource "aws_cloudwatch_log_group" "ai" {
  name              = "/ecs/groupdrive-${var.environment}-ai"
  retention_in_days = 30
}

# ECS Task Definition: NestJS Core API
resource "aws_ecs_task_definition" "api" {
  family                   = "groupdrive-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.api_cpu
  memory                   = var.api_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.api_image
      essential = true

      portMappings = [
        {
          containerPort = 4000
          hostPort      = 4000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "4000" },
        { name = "DATABASE_URL", value = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${var.db_name}?sslmode=require" },
        { name = "REDIS_URL", value = "rediss://:${random_password.redis_auth_token.result}@${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379" },
        { name = "STORAGE_PROVIDER", value = "s3" },
        { name = "S3_BUCKET_NAME", value = aws_s3_bucket.assets.id },
        { name = "S3_REGION", value = var.aws_region }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.api.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])
}

# ECS Task Definition: FastAPI Multilingual AI Service
resource "aws_ecs_task_definition" "ai" {
  family                   = "groupdrive-${var.environment}-ai"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ai_cpu
  memory                   = var.ai_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name      = "ai-service"
      image     = var.ai_service_image
      essential = true

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "ENV", value = "production" },
        { name = "PORT", value = "8000" },
        { name = "HOST", value = "0.0.0.0" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ai.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ai"
        }
      }
    }
  ])
}

# ECS Fargate Service: NestJS API
resource "aws_ecs_service" "api" {
  name            = "groupdrive-${var.environment}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.api_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 4000
  }

  depends_on = [aws_lb_listener.http]
}

# ECS Fargate Service: FastAPI AI Service
resource "aws_ecs_service" "ai" {
  name            = "groupdrive-${var.environment}-ai-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai.arn
  desired_count   = var.ai_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.ai.arn
    container_name   = "ai-service"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.http]
}
