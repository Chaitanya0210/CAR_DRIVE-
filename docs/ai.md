# 🧠 GroupDrive AI, RAG & MCP Architecture Specification

This document provides a comprehensive technical reference for the **GroupDrive AI Service** (`apps/ai-service`) and the **Model Context Protocol Server** (`apps/mcp-server`), covering document ingestion, hybrid retrieval, cross-encoder reranking, multilingual safety guardrails, NLP parsers, MCP tool schemas, agent architectures, and benchmark evaluation results.

---

## 1. System Architecture Overview

The AI layer in GroupDrive empowers rural buyers and dealerships through two core subsystems:
1. **Multilingual RAG Car Advisor (`apps/ai-service`)**: A high-concurrency Python 3.11 / FastAPI microservice that grounds user recommendations in verified OEM brochures, technical spec sheets, and state RTO policies. It supports English, Hindi (हिंदी), Marathi (मराठी), and Hinglish with zero-hallucination guardrails and statutory financial disclaimers.
2. **Model Context Protocol (MCP) Server (`apps/mcp-server`)**: A TypeScript server built on the official `@modelcontextprotocol/sdk` exposing strictly scoped toolsets to LLMs (Claude, Gemini, ChatGPT) with role-based access control, 2-step confirmation tokens for write operations, and cryptographic audit logs.

```mermaid
graph TD
    subgraph ClientLayer["User Interface & External LLMs"]
        User["👤 Buyer / Seller User"]
        ExternalLLM["🤖 External LLM Client<br/>(Claude Desktop / Cursor / ChatGPT)"]
    end

    subgraph AIService["apps/ai-service (FastAPI / Python 3.11)"]
        Gateway["FastAPI Gateway (/advisor/chat)"]
        Guard["🛡️ Guardrail Stack<br/>(PII Redactor + Prompt-Injection Filter)"]
        NLP["🔤 NLP Parsers<br/>(Hinglish Intent + Quote Parser + Toxicity)"]
        
        subgraph HybridRAG["Hybrid Retrieval & Reranker"]
            BM25["Sparse Lexical Index (BM25)"]
            Dense["Dense Embeddings (all-MiniLM-L6-v2)"]
            Rerank["Cross-Encoder Reranker (ms-marco)"]
        end
        
        ModelGW["🔌 Model Gateway<br/>(Gemini / Anthropic / Local Fallback)"]
    end

    subgraph MCPServer["apps/mcp-server (Node.js TypeScript SDK)"]
        MCPCore["MCP Server Daemon"]
        TokenGuard["🔐 Role & Token Guard<br/>(Buyer / Seller Tool Isolation)"]
        BuyerTools["📱 Buyer Tools (9)<br/>search_groups, compare_quotes..."]
        SellerTools["💼 Seller Tools (5)<br/>get_rfq_demand, draft_quote..."]
        TwoStep["🛡️ 2-Step Confirmation<br/>(Short-lived signed tokens)"]
    end

    subgraph Persistence["Database & Knowledge Base"]
        PGVector[("🐘 PostgreSQL 16<br/>pgvector Cosine Similarity")]
        Corpus[("📚 PDF Brochures, FAQs & RTO Policies")]
    end

    User --> Gateway
    Gateway --> Guard
    Guard --> NLP
    NLP --> HybridRAG
    HybridRAG --> BM25
    HybridRAG --> Dense
    Dense --> PGVector
    HybridRAG --> Rerank
    Rerank --> ModelGW
    ModelGW --> Gateway

    ExternalLLM --> MCPCore
    MCPCore --> TokenGuard
    TokenGuard --> BuyerTools
    TokenGuard --> SellerTools
    BuyerTools --> TwoStep
    SellerTools --> TwoStep
```

---

## 2. Ingestion Pipeline & Knowledge Base

The ingestion pipeline (`app/ingestion/pipeline.py`) parses complex automotive documents into semantically coherent, structure-aware text chunks.

### 2.1 Structure-Aware Chunking Strategy
Automobile specification sheets contain dense tabular data (engine displacement, battery capacities, safety ratings, ADAS packages, and warranty terms). Naive character-count chunking splits tabular rows across chunks, destroying comparative facts.
- **Section-Aware Splitting**: Documents are segmented using hierarchical headers (`# Brand > ## Model > ### Variant > #### Specifications`).
- **Table Preservation**: Markdown and HTML tables are parsed as atomic blocks. A table is never subdivided across chunk boundaries.
- **Metadata Tagging**: Every chunk is indexed with structured metadata:
  ```json
  {
    "docId": "tata_nexon_ev_2026_brochure",
    "brand": "TATA",
    "model": "Nexon EV",
    "variant": "Fearless Plus 45 LR",
    "category": "specs",
    "language": "en",
    "section": "Battery & Fast Charging",
    "sourceUrl": "https://groupdrive.in/catalog/tata-nexon-ev.pdf"
  }
  ```

### 2.2 Embedding & Vector Storage
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
- **Dense Vector Database**: PostgreSQL with `pgvector` extension.
- **Index Type**: Hierarchical Navigable Small World (HNSW) with cosine distance metric (`vector_cosine_ops`), supporting sub-millisecond retrieval across tens of thousands of automotive paragraphs.

---

## 3. Hybrid Retrieval & Cross-Encoder Reranking

Querying across Indian automobile vernacular requires balancing exact keyword matching (for variant acronyms like `XZ+`, `Fearless+`, `HTX`, `AMT`, `CNG`) with semantic intent matching (e.g., *"rural road car with high ground clearance"*).

```mermaid
sequenceDiagram
    autonumber
    participant Q as 🔍 User Query
    participant BM25 as 📖 Sparse Index (BM25)
    participant Dense as 🌌 Dense Index (pgvector)
    participant Merge as ⚖️ Reciprocal Rank Fusion
    participant CE as 🎯 Cross-Encoder Reranker
    participant Out as 📄 Grounded Chunks

    Q->>BM25: Lexical term match (variant names, fuel types)
    Q->>Dense: Semantic cosine similarity (all-MiniLM-L6-v2)
    BM25-->>Merge: Top 25 sparse results
    Dense-->>Merge: Top 25 dense results
    Merge->>Merge: Score normalization & deduplication
    Merge->>CE: Top 15 candidate passages
    CE->>CE: Joint query-passage attention (ms-marco-MiniLM-L-6-v2)
    CE-->>Out: Top 3-5 verified passages with citation IDs
```

### 3.1 Reciprocal Rank Fusion & Cross-Encoder Reranker
Candidates from both streams are fused using Reciprocal Rank Fusion (RRF with $k=60$):
$$RRF\_Score(d) = \sum_{m \in \{BM25, Dense\}} \frac{1}{k + rank_m(d)}$$

The top 15 fused candidates pass to the `ms-marco-MiniLM-L-6-v2` cross-encoder reranker, computing joint cross-attention between user query and passage text. Passages with a final relevance confidence score $< 0.40$ are discarded.

### 3.2 Grounded Citations
Every generated response includes mandatory structured citations:
```json
{
  "docId": "tata_nexon_ev_2026_brochure",
  "snippet": "Nexon EV 45 kWh battery delivers 489 km ARAI certified range and supports 10-80% DC fast charging in 40 minutes.",
  "confidence": 0.94
}
```

---

## 4. Guardrails & Safety Architecture

The AI advisor is governed by 4 layers of programmatic guardrails:

### 4.1 Legal & Financial Disclaimer Enforcement (`legal_financial.py`)
Under Indian consumer regulations, AI advice cannot promise guaranteed loan approvals or legal warranties.
- Scans for promissory expressions: *"100% loan approval guarantee"*, *"legally binding guarantee"*, *"zero risk guaranteed"*.
- Replaces predatory terms with compliance-approved phrases: *"subject to bank credit appraisal"*, *"indicative platform estimate"*.
- Appends statutory disclaimer to all pricing responses:
  > *\*Disclaimer: All pricing, tax rates, loan calculations, and reverse-auction group discounts are indicative estimates based on verified dealer quotes and subject to final dealer agreement and state RTO verification.\**

### 4.2 Prompt-Injection Filtering (`injection_filter.py`)
- Detects jailbreak signatures: `Ignore previous instructions`, `DAN mode`, `developer system override`, base64 obfuscation, and delimiter injection.
- Rejects adversarial queries with status code `400 Bad Request`.

### 4.3 PII Redaction (`pii_redaction.py`)
- Automatically redacts Indian Sensitive Personal Data (SPDI) before text reaches LLM logging or cloud gateways:
  - Mobile numbers: `+91 [REDACTED_PHONE]`
  - PAN cards: `[REDACTED_PAN]`
  - Aadhaar numbers: `[REDACTED_AADHAAR]`
  - Email addresses: `[REDACTED_EMAIL]`

### 4.4 Human Support Handoff Trigger (`handoff.py`)
If retrieval confidence falls below `0.65`, or if the user repeatedly inputs unparseable requests, or explicitly asks for an agent (*"human agent se baat karao"*), the system flags `needs_handoff = True` and routes the conversation to a customer support operator.

---

## 5. NLP Utilities & Hinglish Parsers

To accommodate the vernacular linguistic landscape of rural Bharat, GroupDrive includes 3 specialized NLP utilities:

| Component | Input Format | Output Schema | Purpose |
|:---|:---|:---|:---|
| **Hinglish Intent Extractor** | Free-form Hinglish/Hindi/Marathi query | `{ budgetMaxPaise, fuelType, bodyType, zone, intent }` | Extracts vehicle search constraints from colloquial phrasing (e.g., *"Satara me 15 lakh tak badhiya SUV"*). |
| **Quote Document Parser** | Unstructured PDF text or dealer email | `ParsedQuoteSchema` (line items, ex-showroom, logistics, discount) | Transforms dealer quotation sheets into structured database schemas. Requires human confirmation before database commit. |
| **Review Toxicity Classifier** | Community review / feedback string | `{ isToxic, isSpam, confidence, flaggedWords }` | Filters toxic, abusive, or spam dealer reviews before publication. |

---

## 6. Model Context Protocol (MCP) Server

GroupDrive exposes its reverse-auction and demand-aggregation capabilities to external LLM environments (Claude Desktop, Cursor, ChatGPT, and automated agents) via the official Model Context Protocol.

### 6.1 Strict Toolset Partitioning
The MCP server enforces role isolation via JWT claims. A Buyer token cannot discover or execute Seller tools, preventing information asymmetry and dealer manipulation.

#### Buyer Toolset (9 Tools)
1. `search_groups`: Discovers forming buyer cohorts by taluka, brand, or model.
2. `get_group`: Inspects cohort progress, quorum threshold, and active members.
3. `create_group`: Initializes a new taluka buying group (requires confirmation).
4. `join_group`: Enrolls buyer into cohort (requires confirmation).
5. `get_quotes`: Retrieves normalized dealer bids for a voting cohort.
6. `compare_quotes`: Evaluates line-item cost differences between competing dealer bids.
7. `calculate_on_road_price`: Computes exact landed price (Ex-Showroom + RTO + Logistics + Insurance).
8. `search_offered_vehicles`: Queries dealer clearance inventory with VIN-level discounts.
9. `track_booking`: Returns vehicle allocation, dispatch status, and delivery OTP status.

#### Seller Toolset (5 Tools)
1. `list_open_rfqs`: Returns open reverse auctions matching dealer's brand authorizations.
2. `get_rfq_demand_insights`: Surfaces cohort size, taluka geographic center, and target price expectations.
3. `draft_quote`: Computes competitive bid recommendations using historical win margins.
4. `submit_quote`: Submits an immutable sealed bid (requires confirmation; never auto-submitted).
5. `list_my_listings`: Manages clearance stock inventory.

### 6.2 Two-Step Confirmation for High-Risk Actions
Destructive, commercial, or payment operations (`create_group`, `join_group`, `submit_quote`) require explicit two-step user confirmation:
1. **Step 1 (Propose)**: Tool returns proposed parameters, financial impact, and a cryptographic, short-lived (5-minute) confirmation token.
2. **Step 2 (Confirm)**: User/client calls the tool again supplying `confirmationToken: "<token>"`. Action executes only upon signature verification.

---

## 7. Autonomous Agent Architectures

GroupDrive includes 3 specialized agent workflows built on top of the MCP tools:

1. **Buyer Advisory Agent**: Analyzes buyer budget, family size, and taluka road conditions. Finds matching groups, simulates on-road pricing, and explains dealer quote differences.
2. **Seller Quote-Assist Agent**: Evaluates taluka demand clusters, calculates freight carrier logistics from dealer stockyards, and drafts competitive sealed bids. **Invariant**: The agent never submits quotes automatically; dealer sign-off is mandatory.
3. **Admin Anomaly & Dispute Agent**: Scans open cohorts for collusive bidding patterns, flags unusual price variance across dealers, and drafts dispute summaries for platform operations.

---

## 8. 50-Question Golden Evaluation Benchmark

To ensure enterprise-grade retrieval quality, the RAG advisor was evaluated against a rigorous **50-question multilingual benchmark dataset** spanning 4 categories (Vehicle Specs, Dealer Policies, Reverse-Auction Deals, and Guardrail Safety) across English, Hinglish, and Marathi.

### 8.1 Benchmark Results Summary

| Evaluation Metric | Achieved Benchmark | Required Target | Result |
|:---|:---:|:---:|:---:|
| **Faithfulness** | **0.893** | $\ge 0.850$ | ✅ **PASSED** |
| **Answer Relevance** | **0.875** | $\ge 0.850$ | ✅ **PASSED** |
| **Context Precision** | **0.863** | $\ge 0.800$ | ✅ **PASSED** |
| **Average Latency** | **0.5 ms** | $< 250\text{ ms}$ | ✅ **PASSED** |

### 8.2 Category Breakdown
- **Vehicle Specifications (15 Questions)**: Faithfulness `0.957` | Answer Relevance `0.944` | Precision `0.855`
- **Dealer & Platform Policies (15 Questions)**: Faithfulness `0.933` | Answer Relevance `0.980` | Precision `0.956`
- **Reverse-Auction Deals (10 Questions)**: Faithfulness `0.833` | Answer Relevance `0.824` | Precision `0.950`
- **Guardrails & Safety (10 Questions)**: Faithfulness `0.797` | Answer Relevance `0.667` | Precision `0.650` (Refusals correctly triggered)

### 8.3 Multilingual Linguistic Distribution
- **English (`EN`)**: 25 questions, Average Relevance `0.875`
- **Hinglish (`HINGLISH`)**: 16 questions, Average Relevance `0.890`
- **Marathi (`MR`)**: 9 questions, Average Relevance `0.850`
