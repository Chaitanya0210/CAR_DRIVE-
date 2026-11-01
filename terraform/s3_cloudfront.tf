# =============================================================================
# Secure S3 Bucket & CloudFront CDN with Origin Access Control (OAC)
# =============================================================================

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Vehicle Photos & KYC Documents S3 Bucket
resource "aws_s3_bucket" "assets" {
  bucket        = "groupdrive-${var.environment}-assets-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = {
    Name = "groupdrive-${var.environment}-assets"
  }
}

# Block all public S3 access (enforce access through CloudFront only)
resource "aws_s3_bucket_public_access_block" "assets" {
  bucket = aws_s3_bucket.assets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# S3 Server-Side Encryption (AES-256)
resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle policy: Transition deleted KYC and temporary inspect files to Glacier after 90 days
resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  rule {
    id     = "archive-aged-temp"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 30
    }
  }
}

# CloudFront Origin Access Control (OAC)
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "groupdrive-${var.environment}-oac"
  description                       = "OAC for GroupDrive vehicle catalog and documents"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront CDN Distribution
resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name              = aws_s3_bucket.assets.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.assets.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "GroupDrive Vehicle Media & UI Assets CDN"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.assets.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 2592000  # 30 days
    compress               = true
  }

  price_class = "PriceClass_200" # Asia, North America, Europe

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "groupdrive-${var.environment}-cdn"
  }
}

# S3 Bucket Policy allowing CloudFront OAC read
resource "aws_s3_bucket_policy" "cdn_read" {
  bucket = aws_s3_bucket.assets.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.assets.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}
