# GroupDrive System Architecture & Codebase Quality Audit

**Date:** October 31, 2026  
**Auditor:** QA Lead & Principal Systems Engineer  
**Target:** Monorepo (`@groupdrive/api`, `@groupdrive/buyer-web`, `@groupdrive/seller-web`, `@groupdrive/admin-web`, `@groupdrive/ai-service`, `@groupdrive/mcp-server`, `@groupdrive/shared`, `@groupdrive/db`, `@groupdrive/ui`)

---

## 1. Executive Summary

This formal audit evaluates the complete GroupDrive monorepo against all project rules, architectural constraints, and functional specifications across the 11 development modules.

### Audit Verdict: **CONDITIONAL PASS — REMEDIATIONS REQUIRED**
- **Type Checking:** Passed across all 9 workspaces (`turbo type-check`).
- **Unit & Integration Tests:** 100% pass across `@groupdrive/shared` (25 tests), `@groupdrive/ui` (11 tests), `@groupdrive/db` (3 tests), `@groupdrive/api` (39 tests), and `@groupdrive/mcp-server` (25 tests).
- **Core End-to-End Suite:** Golden-path Playwright test (`tests/e2e/golden-path.spec.ts`) passes WCAG 2.2 AA accessibility and 9-stage deal lifecycle.
- **Critical Findings Requiring Fixes:**
  1. **State Machine Bypasses:** Transition validation helper `assertValidTransition()` from `@groupdrive/shared` was defined but never wired into `@groupdrive/api` controllers or `@groupdrive/mcp-server` write tools. State updates (e.g. KYB review, group progression) executed directly.
  2. **Type Discrepancy in FSM:** `GroupStatus` and `SellerKybStatus` enums in `@groupdrive/shared` differed in naming from Prisma DB models and `platform-store.ts`.
  3. **AI Service Eval Failure:** 50-question golden benchmark exited with code 1 (`Faithfulness: 0.837` vs threshold `0.850`) due to human handoff regex and evaluator chunk alignment.
  4. **Missing Required Docs:** `docs/state-machines.md` with Mermaid diagrams and `docs/rbi-nodal-escrow-structure.md` were missing.
  5. **PrismaService `$queryRaw` Delegation:** Missing `$queryRaw` getter caused TypeScript compilation error in `health.controller.ts`.

---

## 2. Module-by-Module Specification vs. Implementation Analysis

| Module | Specified Requirements | Implementation Status | Missing / Incomplete Items |
| :--- | :--- | :--- | :--- |
| **1. Auth & RBAC** | Phone OTP for buyers, Seller password+TOTP MFA, Admin MFA, Portal JWT audience separation (`gd:buyer`, `gd:seller`, `gd:admin`), Seller KYB lifecycle | **IMPLEMENTED** (`apps/api`, `@groupdrive/shared/rbac`) | Strict token audience check at API gateway level requires runtime enforcement across all endpoints. |
| **2. Zones & PostGIS** | Hierarchical browse (State > District > Taluka > Village), Centroid geometry, PostGIS nearby queries, density class quorum, cluster merge logic | **IMPLEMENTED** (`packages/db/prisma`, `packages/ui/src/components/zone-selector.tsx`) | PostGIS ST_DWithin query optimization in database server for large village datasets. |
| **3. Catalog & Search** | Brand/Model/Variant CRUD for Catalog Manager, Specs, City pricing, SearchService interface with Postgres full-text | **IMPLEMENTED** (`packages/db`, `@groupdrive/shared`) | OpenSearch adapter stub for future production migration. |
| **4. Groups** | Group FSM (`DRAFT > OPEN > THRESHOLD_MET > RFQ_OPEN > QUOTES_CLOSED > VOTING > WINNER_SELECTED > BOOKING > COMPLETED`), BullMQ transitions, Chat toxicity/spam hook, suggestions | **PARTIAL / DISCREPANCY** | `docs/state-machines.md` missing. FSM state names differed across shared, prisma, and store. BullMQ relies on mock daemon in test environment. |
| **5. RFQ, Quotes & Landed Cost** | RFQ auto-trigger at quorum, Dealer eligibility filter, Sealed bidding, Landed-cost engine (road tax, RTO, TCS, logistics), Hidden-charges detector | **IMPLEMENTED** (`packages/shared/src/landed-cost`, `apps/mcp-server`) | Sealed quotes encryption at rest in DB needs KMS envelope in production. |
| **6. Booking, Payment, Delivery & Settlement** | Individual ₹25,000 booking deposit, `HELD_PENDING_DELIVERY`, 1% commission + 18% GST settlement, append-only `LedgerEntry` trigger, Delivery milestones, PDI odometer <100 km | **IMPLEMENTED** (`packages/db/prisma`, `packages/db/src/__tests__/ledger.test.ts`, `platform-store`) | `docs/rbi-nodal-escrow-structure.md` was missing. Registration fee invoice PDF generation flow needs completion. |
| **7. Offered Vehicles** | Clearance/demo listings, masked VIN, deal score, demo odometer, fraud checks, "Start group around vehicle" | **IMPLEMENTED** (`packages/db/prisma`, `packages/ui/offer-card.tsx`, `platform-store`) | S3/MinIO binary image upload worker needs local bucket auto-provisioning. |
| **8. Admin & Seller Analytics** | KYB review queue (approve/reject), Listing moderation, Dispute management, Finance view with ledger CSV export, Seller dashboard, CSV inventory importer | **IMPLEMENTED** (`apps/admin-web`, `apps/seller-web`, `apps/api/src/admin`) | State transition assertions missing on admin KYB approve/reject endpoints. |
| **9. AI Service** | Multilingual RAG Car Advisor, hybrid BM25+vector, guardrails (no legal/financial guarantees, PII redaction, handoff), Hinglish entity extraction, quote parser, 50-q eval harness | **IMPLEMENTED (BENCHMARK DEFICIENCY)** | Benchmark exited code 1 on faithfulness (0.837 < 0.850). Preposition in handoff regex (`speak with`) and corpus policy coverage. |
| **10. MCP Server** | Official TypeScript MCP SDK, Scoped Buyer & Seller tools, Two-step confirmation for write tools, Rate limits, Cost budgets, Idempotency keys, Autonomous agents | **IMPLEMENTED** (`apps/mcp-server`) | Direct store status mutations bypassed `@groupdrive/shared` FSM transition validator. |
| **11. Cross-Cutting** | Notifications (SMS, WhatsApp, Email, Push) with DLQ and retries, i18n (EN, HI, MR), PWA offline, Security ASVS, OpenTelemetry, Sentry, Playwright E2E | **IMPLEMENTED** (`apps/api`, `apps/buyer-web`, `docs/security-asvs.md`) | Accessibility and multi-language tests fully passing. |

---

## 3. Inconsistencies Between `@groupdrive/shared` Types and API/Store Models

### 3.1 Group Lifecycle Status Mismatch
- **Module Spec:**
  `DRAFT > OPEN > THRESHOLD_MET > RFQ_OPEN > QUOTES_CLOSED > VOTING > WINNER_SELECTED > BOOKING > COMPLETED` (plus `EXPIRED`, `CANCELLED`, `MERGED`)
- **`packages/shared/src/types/index.ts` & `schema.prisma`:**
  `DRAFT | FORMING | QUORUM_REACHED | RFQ_ACTIVE | VOTING_OPEN | DEAL_LOCKED | FULFILLMENT | COMPLETED | CANCELLED`
- **`apps/mcp-server/src/store/platform-store.ts`:**
  `DRAFT | OPEN | THRESHOLD_MET | RFQ_OPEN | QUOTES_CLOSED | VOTING | WINNER_SELECTED | BOOKING | COMPLETED`
- **Remediation:** Align `@groupdrive/shared` FSM transitions and type definitions to support both the canonical specification names and internal aliases, with bidirectional mapping so no layer rejects valid states.

### 3.2 Seller KYB Status Mismatch
- **`packages/shared`:** `REGISTERED`, `KYB_PENDING`, `KYB_VERIFIED`, `KYB_REJECTED`, `FEE_PENDING`, `ACTIVE`, `SUSPENDED`
- **`packages/db/prisma`:** `SellerKycStatus` (`DRAFT`, `SUBMITTED`, `VERIFIED`, `REJECTED`) combined with `SellerRegistrationFeeStatus` (`UNPAID`, `PAID`, `EXEMPT`).
- **Remediation:** Provide standard utility functions in `@groupdrive/shared` mapping compound DB status to composite KYB state machine status.

---

## 4. State Machine Bypass Vulnerabilities

1. **Unenforced API Status Transitions:**
   - In `apps/api/src/admin/admin.service.ts`:
     - `approveSellerKyb()` executes `sellerProfile.update({ data: { kycStatus: 'VERIFIED' } })` regardless of current state. A seller in `DRAFT` (not submitted) can be verified directly.
     - `rejectSellerKyb()` updates status to `REJECTED` without validating that the seller was `SUBMITTED` or `KYB_PENDING`.
2. **Unenforced MCP Tool Status Transitions:**
   - In `apps/mcp-server/src/tools/buyer/join-group.ts`:
     - When `currentSize === targetSize`, `group.status` is directly assigned `'THRESHOLD_MET'` without calling `assertValidTransition('GROUP', currentStatus, 'THRESHOLD_MET', ...)`.
3. **Ledger Integrity:**
   - The PostgreSQL append-only trigger on `LedgerEntry` prevents UPDATE and DELETE statements (`RAISE EXCEPTION 'Ledger entries are strictly append-only'`). However, software services must catch and handle this exception gracefully.

---

## 5. Dead Code & Unused Elements

1. `apps/api/src/prisma/prisma.service.ts`: Missing `$queryRaw` property caused TS2339 build failure while `$queryRawUnsafe` and `$executeRawUnsafe` were exposed.
2. `apps/ai-service/app/eval/run_eval.py`: Evaluator queried `hybrid_retriever` blindly even when `res.handoff.needs_handoff` was true and `res.citations` was empty, comparing handoff messages against unrelated car specifications.
3. Stubbed imports in `tests/e2e/golden-path.spec.ts`: Statically importing platform-store while omitting runtime transition assertions.

---

## 6. Documentation Gaps & Required Action Items

1. **`docs/state-machines.md`**: Must be authored immediately with comprehensive Mermaid state diagrams for Group, RFQ, Quote, Booking, Seller KYB, and Money.
2. **`docs/rbi-nodal-escrow-structure.md`**: Must be authored immediately detailing the regulatory requirements under RBI Master Directions for Payment Aggregators & Payment Gateways (DPSS.CO.PD.No.1810/02.14.008/2019-20) for the ₹25,000 held deposit before live production launch.

---

## 7. Prioritized Remediation Plan

| Priority | Category | Issue | Action |
| :--- | :--- | :--- | :--- |
| **P1** | Money & Data | Missing RBI Nodal & Escrow Architecture Specification | Author `docs/rbi-nodal-escrow-structure.md` covering nodal account mandates, escrow agreements, and settlement SLAs. |
| **P2** | Security & FSM | State Machine Bypass in API & MCP | Wire `assertValidTransition()` into `admin.service.ts` and `platform-store.ts`. Ensure illegal transitions throw 400 Bad Request. |
| **P2** | Consistency | FSM Enum Inconsistencies & State Machine Docs | Author `docs/state-machines.md` with complete Mermaid diagrams and align type aliases in `@groupdrive/shared`. |
| **P3** | Flow / Tests | AI Service Eval Benchmark Faithfulness Failure (<0.85) | Fix regex in `handoff.py`, update `corpus.py` with loan/PII policy chunks, and refine evaluator context binding. |
| **P4** | Verification | Golden Path End-to-End Walkthrough | Re-run full test suite and verify end-to-end golden path with 0 DB edits. |
