# 🏗️ GroupDrive System Architecture & Technical Specifications

This document outlines the end-to-end technical architecture, system context, service boundaries, lifecycle sequence flows, AI/RAG retrieval pipelines, and deployment topology of the **GroupDrive** platform.

---

## 1. System Context (C4 Level 1)

The system context diagram illustrates how GroupDrive interacts with human actors and external enterprise integrations.

```mermaid
flowchart TD
    subgraph Users["Human Actors"]
        Buyer["👤 Rural / Tier-2/3 Car Buyer<br/>(Browses cohorts, chats in Hinglish, casts votes, pays token)"]
        Seller["🏢 Authorized OEM Dealer<br/>(Monitors taluka demand, submits sealed bids, dispatches cars)"]
        Admin["🛡️ Platform Operations / Risk<br/>(KYB verification, dispute resolution, financial ledger audit)"]
    end

    subgraph Platform["GroupDrive Platform Boundary"]
        System["🚗 GroupDrive Core System<br/>(Demand aggregation, reverse-auction engine, RAG advisor, double-entry escrow)"]
    end

    subgraph External["External Infrastructure & Regulated Services"]
        SMS["📲 SMS & WhatsApp Gateway<br/>(OTP verification, bid alerts, delivery OTPs)"]
        PGW["🏦 Escrow & Payment Aggregator<br/>(RBI-compliant token holds, settlement payouts)"]
        S3["🪣 Cloud Object Storage<br/>(KYB certificates, trade agreements, invoices)"]
        Vahan["🏛️ MoRTH Parivahan / Vahan API<br/>(Chassis validation, RTO road tax schedules)"]
    end

    Buyer -->|"Joins groups, reviews quotes, pays deposit"| System
    Seller -->|"Submits KYB documents, drafts bids, confirms chassis"| System
    Admin -->|"Moderates listings, audits ledger, executes settlements"| System

    System -->|"Sends notifications & OTPs"| SMS
    System -->|"Captures tokens & settles funds"| PGW
    System -->|"Stores & retrieves confidential documents"| S3
    System -->|"Queries vehicle specs & tax brackets"| Vahan
```

---

## 2. Service Boundaries & Container Architecture (C4 Level 2)

GroupDrive is architected as an event-driven modular microservices suite sharing a unified PostgreSQL transactional database with PostGIS spatial extensions.

```mermaid
graph TB
    subgraph Edge["Edge & Ingress Layer"]
        Caddy["🛡️ Caddy 2.8 Reverse Proxy<br/>TLS Termination, Gzip/Zstd, Path Routing, Rate Limiting"]
    end

    subgraph WebApps["Client Application Tier (Next.js 14 App Router)"]
        BW["📱 Buyer Web (Port 3000)<br/>- Multilingual i18n (EN/HI/MR)<br/>- PWA offline caching<br/>- Onboarding interactive tour"]
        SW["💼 Seller Portal (Port 3001)<br/>- Regional demand heatmap<br/>- Quote-Assist drafting UI<br/>- Bulk stock CSV importer"]
        AW["🛡️ Admin Console (Port 3002)<br/>- Real-time auction telemetry<br/>- Fast-forward lifecycle simulator<br/>- Financial ledger reconciliation"]
    end

    subgraph BackendCore["Backend Services Tier"]
        API["⚡ Core API Gateway (Port 4000 - NestJS 10)<br/>- REST Endpoints & WebSocket Gateway<br/>- Zod Schema Validation<br/>- RBAC & KYB Authorization Guards<br/>- Double-Entry Ledger Core Engine"]
        MCP["🤖 MCP Server (Port 3005 - TypeScript SDK)<br/>- Scoped Buyer Tools (Search, Calculate)<br/>- Scoped Seller Tools (Draft, RFQ)<br/>- 2-Step Confirmation Security Tokens"]
        AI["🧠 AI Service (Port 8000 - FastAPI / Python 3.11)<br/>- Multilingual RAG Car Advisor<br/>- Structure-Aware PDF Ingestion<br/>- Hinglish NLP & Intent Parser<br/>- AI Guardrails & PII Redaction"]
    end

    subgraph Persistence["Storage & Messaging Tier"]
        DB[("🐘 PostgreSQL 16 + PostGIS<br/>- Spatial Taluka Hierarchies<br/>- pgvector Embeddings<br/>- Immutable Append-Only Ledger")]
        Redis[("⚡ Redis 7.2<br/>- BullMQ Auction Timers<br/>- Real-time WebSocket Pub/Sub<br/>- Idempotency & Rate Limits")]
        MinIO[("🪣 Object Storage (MinIO / S3)<br/>- Encrypted KYB PDF Storage<br/>- Dealer Invoices & Receipts")]
    end

    Caddy -->|/api/*| API
    Caddy -->|/ai/*| AI
    Caddy -->|/seller/*| SW
    Caddy -->|/admin/*| AW
    Caddy -->|/*| BW

    BW -->|REST / WebSockets| API
    SW -->|REST / WebSockets| API
    AW -->|REST / WebSockets| API
    BW -->|Direct SSE Stream| AI

    API -->|Prisma Client| DB
    API -->|BullMQ Producer| Redis
    API -->|Internal IPC| AI
    MCP -->|Authenticated REST| API

    AI -->|pgvector Cosine Search| DB
    AI -->|Document Blobs| MinIO
    API -->|Signed URL Uploads| MinIO
```

---

## 3. Request Flow for the RFQ Lifecycle (Sequence Diagram)

The following sequence details how a buyer group reaches quorum, triggers a competitive sealed-bid reverse auction among dealers, conducts democratic voting, locks the deal, and completes doorstep delivery with double-entry settlement.

```mermaid
sequenceDiagram
    autonumber
    actor Buyer as 👤 Buyer Cohort (5+ Members)
    participant BW as 📱 Buyer Web App
    participant API as ⚡ Core API Gateway
    participant Redis as ⚡ Redis (BullMQ Timers)
    actor Seller1 as 🏢 Dealer A (Pune)
    actor Seller2 as 🏢 Dealer B (Satara)
    participant AI as 🧠 AI Service
    participant DB as 🐘 PostgreSQL & Ledger

    Note over Buyer, DB: PHASE 1: DEMAND AGGREGATION & QUORUM
    Buyer->>BW: Joins Tata Nexon EV Cohort (Satara Taluka)
    BW->>API: POST /groups/:id/join
    API->>DB: INSERT INTO Membership (ACTIVE)
    API->>DB: Check group size vs. targetQuorum (5/5)
    API->>DB: UPDATE Group SET status = 'QUORUM_REACHED'
    API->>Redis: Schedule RFQ launch job

    Note over API, Seller2: PHASE 2: SEALED-BID REVERSE AUCTION (48h WINDOW)
    Redis->>API: Trigger RFQ Creation
    API->>DB: INSERT INTO RFQ (status = 'SEALED_BIDDING', expiresAt = T+48h)
    API-->>Seller1: Notify Eligible Dealers in Zone Cluster
    API-->>Seller2: Notify Eligible Dealers in Zone Cluster

    Seller1->>AI: POST /nlp/quote-assist (Draft competitive bid)
    AI-->>Seller1: Recommended On-Road Landed Quote
    Seller1->>API: POST /rfqs/:id/quotes (Sealed Quote A)
    API->>DB: INSERT INTO Quote (status = 'SEALED', encryptedPayload)

    Seller2->>API: POST /rfqs/:id/quotes (Sealed Quote B)
    API->>DB: INSERT INTO Quote (status = 'SEALED', encryptedPayload)

    Note over Redis, DB: PHASE 3: UNSEALING & LANDED COST NORMALIZATION
    Redis->>API: Bidding Window Closes (T+48h)
    API->>DB: Decrypt quotes & normalize landed costs (RTO + Logistics + Insurance)
    API->>DB: UPDATE Quote SET status = 'NORMALIZED'
    API->>DB: UPDATE RFQ SET status = 'VOTING_OPEN'
    API->>DB: UPDATE Group SET status = 'VOTING_OPEN'

    Note over Buyer, DB: PHASE 4: COHORT VOTING & DEAL LOCKING
    Buyer->>BW: Inspects side-by-side normalized quotes
    Buyer->>BW: Casts vote for Quote A (Dealer A)
    BW->>API: POST /rfqs/:id/vote (quoteId = Quote A)
    API->>DB: INSERT INTO Vote
    API->>DB: Calculate majority quorum (>50% votes)
    API->>DB: UPDATE RFQ SET status = 'AWARDED', winningQuoteId = Quote A
    API->>DB: UPDATE Group SET status = 'DEAL_LOCKED'

    Note over Buyer, DB: PHASE 5: TOKEN BOOKING & ESCROW ALLOCATION
    Buyer->>BW: Pays ₹10,000 Token Hold via Razorpay/UPI
    BW->>API: POST /bookings/token (paymentId)
    API->>DB: INSERT INTO Booking (status = 'TOKEN_CONFIRMED')
    API->>DB: INSERT INTO LedgerEntry (DEBIT Buyer Escrow ₹10,000, CREDIT Holding ₹10,000)

    Note over Seller1, Buyer: PHASE 6: DISPATCH, DOORSTEP DELIVERY & OTP
    Seller1->>API: POST /bookings/:id/chassis (Allocates VIN number)
    API->>DB: UPDATE Booking SET status = 'CHASSIS_ALLOCATED'
    Seller1->>API: POST /bookings/:id/dispatch (Dispatches carrier truck)
    API->>DB: INSERT INTO DeliveryShipment (status = 'IN_TRANSIT')
    
    Note over Seller1, Buyer: Carrier reaches Buyer Taluka
    Buyer->>BW: Verifies vehicle inspection & provides 6-digit Delivery OTP
    BW->>API: POST /bookings/:id/confirm-delivery (otp = 492810)
    API->>DB: UPDATE Booking SET status = 'FULFILLED'
    API->>DB: UPDATE DeliveryShipment SET status = 'DOORSTEP_DELIVERED'

    Note over API, DB: PHASE 7: ESCROW RECONCILIATION & SETTLEMENT
    API->>DB: Compute 1% Platform Commission (₹14,990 on ₹14.99L deal)
    API->>DB: INSERT INTO Settlement (sellerId, amountPaise = ₹9,900, commissionPaise = ₹100)
    API->>DB: INSERT INTO LedgerEntry (Double-Entry Debit/Credit Equilibrium)
    API->>DB: UPDATE Settlement SET status = 'PROCESSED'
```

---

## 4. Data Flow for the AI / RAG Pipeline (Sequence Diagram)

The AI architecture handles multi-language document ingestion, hybrid sparse-dense retrieval, reranking, and guardrail filtering for Hinglish, Hindi, Marathi, and English user prompts.

```mermaid
sequenceDiagram
    autonumber
    participant Admin as 🛡️ OEM / Admin Operator
    participant Ingest as 📄 Ingestion Pipeline
    participant DB as 🐘 PostgreSQL (pgvector + BM25)
    actor Buyer as 👤 Rural Car Buyer
    participant Fast as 🧠 FastAPI AI Gateway
    participant Guard as 🛡️ Guardrails & PII Redactor
    participant Rerank as 🎯 Cross-Encoder Reranker
    participant LLM as 🤖 Model Gateway (LiteLLM)

    Note over Admin, DB: INGESTION PIPELINE (PRE-COMPUTATION)
    Admin->>Ingest: Uploads OEM Brochure / Spec PDF / Policy Document
    Ingest->>Ingest: OCR & Structure-Aware Table Extraction
    Ingest->>Ingest: Chunking by Section (keeps variant comparison tables intact)
    Ingest->>Ingest: Generate Embeddings (sentence-transformers/all-MiniLM-L6-v2)
    Ingest->>DB: Store DocumentChunks with metadata (brand, model, variant, language, vector)

    Note over Buyer, DB: RETRIEVAL & GROUNDED INFERENCE
    Buyer->>Fast: "Satara me ₹15 lakh budget me best EV konsi rahegi with fast charging?"
    Fast->>Guard: Validate Input (Prompt Injection Check + PII Detection)
    Guard-->>Fast: Input Cleaned & Sanitized
    Fast->>Fast: Extract Entities (Budget: ₹15L, Type: EV, District: Satara)
    
    par Hybrid Retrieval
        Fast->>DB: Sparse Search (BM25 lexical index on model/variant terms)
        Fast->>DB: Dense Search (pgvector cosine similarity with query embedding)
    end
    DB-->>Fast: Top 25 Candidate Document Chunks

    Fast->>Rerank: Cross-Encoder Rerank (ms-marco-MiniLM-L-6-v2)
    Rerank-->>Fast: Top 5 Highest-Scoring Chunks with Citation Metadata

    Fast->>LLM: Formulate Grounded Prompt with System Guardrails & Chunks
    Note over LLM: Enforces: No legal/financial advice, citations mandatory, Hindi/Hinglish tone
    LLM-->>Fast: Streaming Generated Answer with Citations
    
    Fast->>Guard: Output Guardrail Scan (Toxicity check + PII scrub)
    Guard-->>Fast: Verified Output
    Fast-->>Buyer: Delivers Streaming Answer with Source Citations & Disclaimer
```

---

## 5. Deployment Topology (Production Cloud Architecture)

GroupDrive is engineered for resilient single-VM Docker Compose deployments or enterprise multi-AZ AWS cloud deployments.

```mermaid
graph TD
    subgraph Internet["Public Internet"]
        Clients["Web Browsers & Mobile Clients (HTTPS / WSS)"]
    end

    subgraph Edge["Edge & Load Balancing"]
        DNS["Route 53 / Cloudflare DNS"]
        Proxy["Caddy 2.8 Reverse Proxy<br/>- Automated Let's Encrypt TLS<br/>- HTTP/2 & HTTP/3 Support<br/>- Strict Security Headers (CSP, HSTS)"]
    end

    subgraph AppTier["Application Compute Tier (Docker / ECS Fargate)"]
        BW_Pod["buyer-web Container<br/>Next.js 14 Standalone (Port 3000)"]
        SW_Pod["seller-web Container<br/>Next.js 14 Standalone (Port 3001)"]
        AW_Pod["admin-web Container<br/>Next.js 14 Standalone (Port 3002)"]
        API_Pod["api Gateway Container<br/>NestJS 10 (Port 4000)"]
        AI_Pod["ai-service Container<br/>FastAPI / Python 3.11 (Port 8000)"]
        MCP_Pod["mcp-server Container<br/>Node.js TypeScript (Port 3005)"]
    end

    subgraph DataTier["Data & Persistence Tier"]
        RDS[("Amazon RDS PostgreSQL 16<br/>- Multi-AZ High Availability<br/>- PostGIS Spatial Extension<br/>- pgvector Embeddings Extension<br/>- Append-Only Financial Ledger")]
        ElastiCache[("Amazon ElastiCache Redis 7.2<br/>- BullMQ Async Queues<br/>- Session & Rate-Limit Cache<br/>- Realtime WS Pub/Sub Engine")]
        S3Bucket[("Amazon S3 Object Storage<br/>- SSE-KMS Encrypted Storage<br/>- Dealer KYB PDFs & Invoices<br/>- Automated Lifecycle Retention")]
    end

    Clients --> DNS
    DNS --> Proxy
    Proxy --> BW_Pod
    Proxy --> SW_Pod
    Proxy --> AW_Pod
    Proxy --> API_Pod
    Proxy --> AI_Pod

    API_Pod --> RDS
    API_Pod --> ElastiCache
    API_Pod --> S3Bucket
    AI_Pod --> RDS
    AI_Pod --> S3Bucket
    MCP_Pod --> API_Pod
```

---

## 6. Security & Invariant Guarantees

1. **Double-Entry Ledger Equality**: Every debit in `LedgerEntry` has an equal and opposite credit. Balance calculations enforce $\sum \text{Debits} - \sum \text{Credits} = 0$ at all times.
2. **PostgreSQL Immutability Triggers**: `LedgerEntry` and `AuditLog` rows cannot be modified or deleted via SQL commands; any `UPDATE` or `DELETE` attempt raises a database exception.
3. **No Floating-Point Arithmetic**: All monetary quantities are strictly represented as 64-bit integer paise ($1\text{ INR} = 100\text{ paise}$).
4. **Role Isolation**: Buyer tokens cannot execute Seller or Admin actions; Seller tokens cannot access other dealers' bids; sealed bids remain encrypted until the 48-hour auction timer expires.
5. **AI Safety & Disclaimers**: The AI Car Advisor is strictly prohibited from offering binding financing quotes or legal warranties, automatically attaching statutory disclaimers to all pricing outputs.
