# Changelog

All notable changes to the **GroupDrive** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-01

### 🚀 Major Release - GroupDrive Collective Vehicle Buying Platform

GroupDrive v1.0.0 is the foundational production-ready release of India's first collective vehicle buying platform. It connects rural and semi-urban car buyers into localized demand cohorts, orchestrating reverse auctions among authorized dealership networks with landed-cost calculations, sealed bidding, and financial ledger integrity.

---

### Added

#### Core Domain & Data Layer (`@groupdrive/db`, `@groupdrive/shared`)
- **Geographic Hierarchy**: Three-tier zone hierarchy (State > District > Taluka) with PostGIS spatial indexing (`ST_DWithin`, `ST_Point`) and density classification (`URBAN`, `SEMI_URBAN`, `RURAL`, `DEEP_RURAL`).
- **Vehicle Catalog**: Hierarchical catalog schema (Brand > Model > Variant) tracking specifications, transmission, fuel type, ex-showroom pricing, and dynamic zone-level road tax slabs.
- **Double-Entry Financial Subledger**:
  - Immutable append-only PostgreSQL ledger table with PostgreSQL trigger (`prevent_ledger_tampering`) blocking `UPDATE` and `DELETE` operations.
  - Subledger account types: `BUYER_REGISTRATION_HOLD`, `ESCROW_DEPOSIT_HOLD`, `PLATFORM_COMMISSION_RECEIVABLE`, `SELLER_PAYOUT_CLEARING`, `REFUND_PENDING_PAYOUT`.
  - Financial invariant checking: debits equal credits, zero float math (all amounts in paise stored as BigInt), and exact 1% commission calculation rounded half-up.
- **State Machine Enforcement**:
  - `GroupStatus`: `FORMING` -> `QUORUM_REACHED` -> `RFQ_OPEN` -> `VOTING` -> `DEAL_LOCKED` -> `DELIVERY_PHASE` -> `COMPLETED` / `DISSOLVED`.
  - `RfqStatus`: `DRAFT` -> `OPEN` -> `CLOSED_PENDING_SEAL_BREAK` -> `UNSEALED` -> `AWARDED` -> `CANCELLED`.
  - `QuoteStatus`: `SEALED` -> `UNSEALED` -> `ACCEPTED` -> `REJECTED` -> `WITHDRAWN`.
  - Explicit database-level state machine validation preventing illegal transitions.

#### NestJS Backend API (`@groupdrive/api`)
- **Admin Operations & RBAC**:
  - Role-based access control guard (`AdminRbacGuard`) supporting `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `SUPPORT_AGENT`.
  - Real-time live-ops metrics, KYB dealer approval queue, territory threshold management, and catalog administration.
  - Subledger reporting endpoint (`/admin/finance/ledger`) with voucher balance audit.
- **Landed Cost Engine**:
  - Exact on-road price calculation covering Ex-Showroom, RTO Road Tax (in-state vs out-of-state, fuel type concessions, EV exemptions), TCS (1% on ex-showroom > ₹10 Lakhs), mandatory third-party insurance, fastag, and dealer logistics.
  - Zero floating-point arithmetic verified across 10 table-driven worked examples.
- **Notification Microservice**:
  - Event-driven notifications with channel adapters for SMS, WhatsApp, Email, and Push notifications.
  - Dead-letter queue (DLQ) retry policies with exponential backoff and localized multilingual templates.
- **Production Observability & Health**:
  - `/health/liveness`, `/health/readiness` (DB and DLQ checks), and `/health/uptime` endpoints.
  - Structured OpenTelemetry tracing and correlation IDs on every inbound request.

#### Multilingual AI Advisory & MCP Engine (`apps/ai-service`, `packages/mcp-server`)
- **Car Advisor RAG Pipeline**:
  - FastAPI service with Hybrid BM25 + Vector semantic retrieval (ChromaDB + Sentence Transformers).
  - Multilingual query parsing for English, Hindi, and Hinglish vernacular rural buyer queries.
  - Safety guardrails preventing prompt injection, off-topic hallucinations, and financial commitments.
- **Model Context Protocol (MCP) Server**:
  - Official TypeScript MCP SDK implementation exposing platform capabilities to LLM clients.
  - Strict token-scoped toolsets:
    - **Buyer Tools**: `search_groups`, `get_group`, `create_group`, `join_group`, `get_quotes`, `compare_quotes`, `calculate_on_road_price`, `search_offered_vehicles`, `track_booking`.
    - **Seller Tools**: `list_open_rfqs`, `get_rfq_demand_insights`, `draft_quote`, `submit_quote`, `list_my_listings`.
  - Two-step confirmation flow (`propose` -> `confirm` with short-lived cryptographically signed token) for all write and monetary operations.
  - Autonomous agents: Buyer Advisor Agent, Seller Quote-Assist Agent, and Admin Dispute Agent.

#### Web Portals (`buyer-web`, `seller-web`, `admin-web`, `@groupdrive/ui`)
- **Design System & Responsive Architecture**:
  - Red/White brand token design system tested at 360px (mobile), 768px (tablet), and 1280px (desktop).
  - Accessible components adhering to WCAG 2.1 AA (zero critical/serious axe issues).
  - Multilingual support (English, Hindi, Marathi) with Lakh/Crore INR currency grouping.
- **Buyer Web**:
  - Group discovery, localized demand cohorts, real-time car advisor widget, price breakdown calculator, onboarding explanation tour, and demo interface.
- **Seller Web**:
  - Demand insights map, sealed bid submission wizard, quote revision controls, and inventory listing manager.
- **Admin Web**:
  - Live operations dashboard, dealer KYB verification portal, financial subledger viewer, and threshold tuning console.

#### Guided Demo Mode & Seed Engine
- **Synthetic Seed Dataset (`pnpm seed:demo`)**:
  - 3 states (Maharashtra, Madhya Pradesh, Karnataka) spanning 10 districts and talukas.
  - 8 automotive brands, 30 car models, 100 variants with realistic Indian market specs.
  - 15 verified dealerships across territories, 100 simulated buyers, 25 lifecycle groups, 40 dealer inventory listings.
- **Fast-Forward Simulation Tool**:
  - Interactive admin simulation API accelerating group lifecycle events: instant quorum fill, bidding closure, buyer voting resolution, delivery sign-off, and clean reset.
  - 10-minute reproducible script documented at `docs/demo-script.md`.

#### Deployment & DevOps
- **Containerization**: Multi-stage, non-root Dockerfiles for all microservices with `docker-compose.prod.yml` single-VM deployment.
- **Cloud Infrastructure Guides**: Comprehensive Terraform AWS-lite infrastructure and low-cost Vercel + Railway deployment guides (`docs/deploy.md`).
- **Disaster Recovery**: Automated database backup and restore scripts with point-in-time recovery verification (`scripts/backup-db.sh`, `scripts/restore-db.sh`).
- **Disaster Runbook**: Step-by-step incident response runbook for database, Redis, payment webhook, and AI provider outages (`docs/runbook.md`).
- **Smoke Suite**: Automated 17-step end-to-end health, RBAC, and lifecycle smoke verification script (`pnpm smoke`).

---

### Fixed & Remediated

- **Security & Authorization**:
  - Remediated IDOR vulnerabilities across booking and quote retrieval endpoints with tenant validation guards.
  - Enforced sealed-bid cryptographic confidentiality; dealer bids remain unreadable until RFQ window closure.
  - Replaced raw queries with parameterized Prisma queries to eliminate SQL injection vectors.
  - Enforced Zod runtime schema validation on all API inputs.
- **UI & Browser Stability**:
  - Content Security Policy (CSP): Resolved Google Fonts stylesheet and font-src loading blockages in `buyer-web`.
  - Next.js Standalone Symlink EPERM: Resolved Windows filesystem permission errors during local builds by conditionalizing standalone output on `DOCKER_BUILD`.
  - React Hydration Mismatch: Replaced dynamic client-rendered timestamps with static initial SSR markers in `CarAdvisorChatWidget`.
  - Favicon 404s: Added SVG favicons and registered icon metadata across all 3 web apps.
- **Concurrency & Embedded Database**:
  - PGlite Concurrency: Resolved connection pool exhaustion and socket resets on Windows by serializing subledger queries and configuring `connection_limit=1`.

---

### Documentation
- `README.md`: System overview, quick start, architecture diagram, and repository map.
- `docs/architecture.md`: C4 system context, container, and sequence diagrams.
- `docs/api.md`: Comprehensive OpenAPI 3.0 specification covering Buyer, Seller, and Admin endpoints.
- `docs/er.md`: Entity-relationship diagram and schema documentation.
- `docs/state-machines.md`: Complete state transition specifications and invalid transition matrices.
- `docs/ai.md`: Multilingual RAG architecture, retrieval benchmarks, and MCP tool specifications.
- `docs/user-guide.md`: End-to-end user manuals with interface screenshots for Buyers, Sellers, and Admins.
- `docs/landed-cost.md`: Statutory formula reference for Indian landed vehicle cost calculation.
- `docs/limitations.md`: Statutory roadmap detailing simulated services vs production compliance requirements.
- `docs/future-work.md`: Phase 2 and Phase 3 commercial roadmap.
