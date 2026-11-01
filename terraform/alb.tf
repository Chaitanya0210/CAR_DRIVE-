# =============================================================================
# Application Load Balancer (ALB) & Path-Based Edge Routing
# =============================================================================

resource "aws_security_group" "alb" {
  name        = "groupdrive-${var.environment}-alb-sg"
  description = "Permit inbound HTTP/HTTPS from Internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "groupdrive-${var.environment}-alb-sg"
  }
}

resource "aws_lb" "main" {
  name               = "groupdrive-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name = "groupdrive-${var.environment}-alb"
  }
}

# Target Group: NestJS API
resource "aws_lb_target_group" "api" {
  name        = "groupdrive-${var.environment}-tg-api"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Target Group: FastAPI AI Service
resource "aws_lb_target_group" "ai" {
  name        = "groupdrive-${var.environment}-tg-ai"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/health"
    matcher             = "200"
    interval            = 20
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# HTTP Listener (Redirects to HTTPS or forwards in dev/staging)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# Routing Rule: Route /ai/* to FastAPI AI Service
resource "aws_lb_listener_rule" "ai_route" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ai.arn
  }

  condition {
    path_pattern {
      values = ["/ai/*"]
    }
  }
}
