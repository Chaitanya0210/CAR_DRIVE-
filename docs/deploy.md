# GroupDrive — Production Deployment & Cloud Infrastructure Guide

> **Document Version:** 1.0.0  
> **Target Audience:** DevOps Engineers, Solutions Architects & SREs  
> **Compliance Standard:** OWASP ASVS Level 2, Zero-Secrets-in-Git Policy

---

## 1. Executive Summary & Architecture Overview

GroupDrive is engineered with a decoupled, containerized architecture that supports both lean, low-cost serverless hosting and enterprise-grade multi-AZ cloud deployments.

```
                    ┌──────────────────────────────────────────────┐
                    │               Internet Users                 │
                    └──────────────────────────────────────────────┘
                                          │
                   HTTPS (TLS 1.3) / ACM / Cloudflare / Let's Encrypt
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   │                                             │
         Low-Cost Model (A)                             AWS-Lite Model (B)
 ┌────────────────────────────────┐            ┌──────────────────────────────────┐
 │ • Frontends: Vercel (Edge CDN) │            │ • CDN & Assets: CloudFront + S3  │
 │ • API: Railway / Render        │            │ • Gateway: Application LB (ALB)  │
 │ • AI Service: Railway / Fly.io │            │ • Compute: ECS Fargate Multi-AZ  │
 │ • Database: Neon / Supabase    │            │ • Database: RDS Postgres 16 (gp3)│
 │ • Cache: Upstash Redis         │            │ • Cache: ElastiCache Redis 7     │
 │ • Storage: Cloudflare R2       │            │ • Secrets: AWS Secrets Manager   │
 └────────────────────────────────┘            └──────────────────────────────────┘
```

---

## 2. Environment Strategy & Secrets Management

GroupDrive enforces strict environment separation and a zero-secrets-in-git policy.

### Environment Tier Matrix

| Environment | Purpose | Database | Host / Compute | Secrets Source |
| :--- | :--- | :--- | :--- | :--- |
| **Development** | Local coding, unit tests | Local PGlite / Docker | Localhost | `.env` / `.env.development.example` |
| **Staging** | Automated QA, E2E, demo | Cloud Sandbox DB | Railway / Staging ECS | GitHub Actions Secrets / Doppler |
| **Production** | Live transactions & auctions | Multi-AZ RDS Postgres | Vercel + AWS / Railway | AWS Secrets Manager / Doppler |

### Zero-Secrets Security Rules
1. **Never commit `.env` or plain-text credentials**: The `.gitignore` file blocks all `.env` files except `.env.*.example` templates.
2. **Dynamic Runtime Injection**: Containers receive database URLs and JWT secrets as environment variables injected at runtime by the orchestrator (ECS task definitions or Vercel Environment Variables).
3. **Secrets Rotation**: Rotate all production JWT signing keys, payment webhook secrets, and database master passwords every 90 days.

---

## 3. Deployment Strategy (A): Low-Cost Tier ($15 – $35 / month)

Ideal for seed stage, MVP pilots, and regional taluka launches.

### Architecture Layout
- **Frontends (`buyer-web`, `seller-web`, `admin-web`)**: Hosted on **Vercel** with global edge CDN, automatic HTTPS, and Next.js standalone optimization.
- **Backend API (`apps/api`)**: Deployed as a Docker container on **Railway** or **Render**.
- **AI Service (`apps/ai-service`)**: Deployed as a Python container on **Railway** or **Fly.io** (with CPU inference).
- **Postgres Database**: **Neon Serverless PostgreSQL** or **Supabase** (with PostGIS enabled).
- **Redis Cache**: **Upstash Serverless Redis** (pay-per-request).
- **Object Storage**: **Cloudflare R2** (zero egress fees, S3 API-compatible).

---

### Step-by-Step Low-Cost Deployment Guide

#### 1. Deploy Frontends to Vercel
1. Link your GitHub repository to Vercel.
2. Create three Vercel projects from the same repository:
   * **Project 1: `groupdrive-buyer`**
     * Root Directory: `apps/buyer-web`
     * Framework Preset: `Next.js`
     * Build Command: `pnpm --filter @groupdrive/buyer-web build`
     * Output Directory: `.next`
     * Environment Variables:
       * `NEXT_PUBLIC_API_URL`: `https://api.groupdrive.in`
       * `NEXT_PUBLIC_AI_URL`: `https://ai.groupdrive.in`
   * **Project 2: `groupdrive-dealer`**
     * Root Directory: `apps/seller-web`
     * Build Command: `pnpm --filter @groupdrive/seller-web build`
     * Environment Variables: `NEXT_PUBLIC_API_URL`
   * **Project 3: `groupdrive-ops`**
     * Root Directory: `apps/admin-web`
     * Build Command: `pnpm --filter @groupdrive/admin-web build`
     * Environment Variables: `NEXT_PUBLIC_API_URL`

#### 2. Deploy Backend API to Railway / Render
1. In Railway, click **New Project** → **Deploy from GitHub repo**.
2. Set Dockerfile path to `apps/api/Dockerfile`.
3. Add a PostgreSQL plugin or attach external Neon connection string:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-cool-fog.ap-southeast-1.aws.neon.tech/groupdrive?sslmode=require"
   REDIS_URL="rediss://default:token@ap-south-1.upstash.io:6379"
   PORT=4000
   NODE_ENV=production
   JWT_BUYER_SECRET="<generate-64-char-random-key>"
   JWT_SELLER_SECRET="<generate-64-char-random-key>"
   JWT_ADMIN_SECRET="<generate-64-char-random-key>"
   MFA_ENCRYPTION_KEY="<32-byte-hex-string>"
   PAYMENT_PROVIDER="razorpay"
   RAZORPAY_KEY_ID="rzp_live_xxx"
   RAZORPAY_KEY_SECRET="yyy"
   ```
4. Set custom domain: `api.groupdrive.in`.

#### 3. Deploy AI Service to Railway
1. Add new service from GitHub repo.
2. Set Dockerfile path to `apps/ai-service/Dockerfile`.
3. Set Environment variables:
   ```env
   ENV=production
   PORT=8000
   DEFAULT_PROVIDER=gemini
   GEMINI_API_KEY="<google-ai-studio-production-key>"
   ```
4. Set custom domain: `ai.groupdrive.in`.

---

## 4. Deployment Strategy (B): AWS-Lite Production Tier

Designed for high-traffic operations across multiple Indian states, strictly adhering to regulatory compliance and automated failover.

### AWS Infrastructure Components (Terraform)
* **VPC**: 2 Availability Zones (`ap-south-1a`, `ap-south-1b`) in Mumbai with isolated database tiers.
* **RDS PostgreSQL 16**: Multi-AZ `db.t4g.medium` Graviton instance with storage autoscaling (50GB → 200GB gp3).
* **ElastiCache Redis 7**: Managed in-transit and at-rest encrypted cluster.
* **ECS Fargate**: Serverless container execution with automated health recovery.
* **S3 + CloudFront CDN**: Origin Access Control (OAC) with sub-second image loading across rural mobile networks.
* **Application Load Balancer (ALB)**: Path-based SSL routing (`/api/*` → API, `/ai/*` → AI Service).

---

### Provisioning with Terraform

The complete Terraform skeleton is located in [`terraform/`](file:///c:/Users/rayew/Desktop/Major%20project/terraform).

```bash
# 1. Navigate to the terraform directory
cd terraform

# 2. Initialize provider plugins and backends
terraform init

# 3. Create a terraform.tfvars file with your specific cluster configuration
cat <<EOF > terraform.tfvars
aws_region       = "ap-south-1"
environment      = "production"
api_image        = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/groupdrive-api:v1.0.0"
ai_service_image = "123456789012.dkr.ecr.ap-south-1.amazonaws.com/groupdrive-ai:v1.0.0"
EOF

# 4. Review the infrastructure plan
terraform plan -out=tfplan

# 5. Apply infrastructure changes
terraform apply tfplan
```

### Single-VM Alternative with Docker Compose (`docker-compose.prod.yml`)
For a budget AWS setup on a single EC2 instance (`t4g.xlarge` or `t3.large` with 16GB RAM):

```bash
# 1. SSH into your EC2 Ubuntu / Amazon Linux instance
ssh -i groupdrive-key.pem ubuntu@ec2-ip-address

# 2. Clone the repository
git clone https://github.com/groupdrive/groupdrive.git /opt/groupdrive
cd /opt/groupdrive

# 3. Create production .env from template
cp .env.production.example .env
# Edit .env with real Secrets Manager values
nano .env

# 4. Pull and launch the full stack with Caddy reverse proxy
docker compose -f docker-compose.prod.yml up -d --build

# 5. Verify all services are healthy
docker compose -f docker-compose.prod.yml ps
```

---

## 5. Cost Comparison Matrix

| Expense Line Item | Strategy (A): Low-Cost / Serverless | Strategy (B): AWS-Lite Fargate |
| :--- | :--- | :--- |
| **Frontends** | Vercel Pro ($20 / month) | CloudFront + S3 ($5 / month) |
| **API & AI Service** | Railway Pro ($10 – $20 / month) | ECS Fargate ($25 – $40 / month) |
| **Database** | Neon / Supabase ($19 / month) | RDS Postgres Multi-AZ ($65 / month) |
| **Redis Cache** | Upstash Serverless ($0 – $10 / month) | ElastiCache Redis ($15 / month) |
| **Object Storage** | Cloudflare R2 ($0 – $5 / month) | AWS S3 Standard ($5 / month) |
| **Load Balancer** | Included in Vercel / Railway | AWS ALB ($18 / month) |
| **Total Monthly Est.** | **~$49 – $74 / month** | **~$133 – $188 / month** |

---

## 6. Zero-Downtime Rollout & Verification Checklist

1. **Pre-Deployment:**
   - Execute unit, ASVS security, and landed-cost invariant tests: `pnpm test`
   - Run financial ledger balance audit: `pnpm reconcile`
2. **Database Migration:**
   - Execute safe forward-only migration: `packages/db/scripts/migrate-on-deploy.sh`
3. **Container Rollout:**
   - Deploy new image tags to ECS / Railway with zero-downtime rolling update.
4. **Post-Deployment Smoke Test:**
   - Execute automated end-to-end smoke suite:
     ```bash
     pnpm smoke --url https://api.groupdrive.in
     ```
