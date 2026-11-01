# GroupDrive — 10-Minute Evaluator & Stakeholder Demo Script

> **Document Version:** 1.0.0  
> **Environment:** Local Development / Staging  
> **Target Audience:** Evaluators, Investors, Dealership Partners & Engineering Reviewers  
> **Disclaimer:** All catalog specifications, OEM ex-showroom prices, landed cost estimates, regional RTO tax slabs, and reverse-auction quotes are illustrative demo data created solely for platform demonstration and testing.

---

## 1. Executive Summary & Architecture Overview

**GroupDrive** is India’s first rural and semi-urban collective car-buying platform. By aggregating fragmented buyer demand within localized geographic clusters (talukas and districts) across **Maharashtra, Madhya Pradesh, and Karnataka**, GroupDrive unlocks institutional volume discounts through **blind, sealed-bid reverse auctions** among authorized OEM dealerships.

### Platform Services Architecture

| Service | Port | Persona / Role | Key Capability |
| :--- | :--- | :--- | :--- |
| **Buyer Portal** | `http://localhost:3000` | Rural & Semi-urban Buyers | Cohort discovery, RAG Car Advisor, voting & milestone tracking |
| **Guided Demo Hub** | `http://localhost:3000/demo` | Evaluator / Presenter | 1-click persona logins & 5-minute lifecycle fast-forward engine |
| **Seller Hub** | `http://localhost:3001` | Verified OEM Dealerships | KYB status, regional demand cohorts, sealed bidding & CSV inventory |
| **Admin Console** | `http://localhost:3002` | Platform Ops & Finance | KYB gate, listing moderation, live ops & double-entry ledger |
| **Core API & Engine** | `http://localhost:4000` | Microservices Backbone | NestJS + Prisma + PGlite / PostgreSQL, landed cost calculator |
| **Multilingual AI** | `http://127.0.0.1:8000` | AI Advisory Agent | FastAPI + pgvector RAG with Marathi / Hindi / Hinglish queries |

---

## 2. Pre-Flight Setup & Environment Verification

Before beginning the live presentation, ensure all background services are running and the database is freshly seeded.

```bash
# 1. Reset and populate the demo dataset (3 states, 15 dealers, 100 buyers, 25 groups, 40 offered vehicles)
pnpm seed:demo

# 2. Run the financial audit script to ensure 100% ledger balance equilibrium
pnpm reconcile
```

**Expected terminal output for `pnpm reconcile`:**
```text
✔ AUDIT PASSED: 0 balance mismatches or sequence gaps detected.
   All ledger entries and subledgers are 100% mathematically consistent.
   Total Debits: ₹2,03,71,853.48 == Total Credits: ₹2,03,71,853.48
```

---

## 3. Minute-by-Minute Presenter Walkthrough

```
  00:00 - 02:00      02:00 - 04:00      04:00 - 06:00      06:00 - 08:00      08:00 - 10:00
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  DEMO HUB &  │──>│  SELLER HUB  │──>│ FAST-FORWARD │──>│   DEMOCRATIC │──>│   ADMIN OPS  │
│  BUYER RAG   │   │ & KYB GATE   │   │  SEALED BIDS │   │  VOTE & PAY  │   │  & RECONCILE │
└──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘   └──────────────┘
```

---

### Minutes 00:00 – 02:00: Demo Hub & Rural Buyer Discovery

#### Step 1: Open the Demo Hub
- **Action:** Open your browser and navigate to `http://localhost:3000/demo`.
- **Presenter Narrative:**
  > *"Welcome to GroupDrive. To facilitate evaluation, we built a dedicated Demo Hub. In real life, a group buying cycle spans 2 to 3 weeks. Here, we can switch personas instantly and fast-forward state machines on demand."*
- **Screen Verification:**
  - Notice the three Persona Cards: **Sanjay Jagtap** (Buyer, Baramati), **Sahyadri Automotive** (Seller Hub), and **Platform Ops Lead** (Admin Console).
  - Notice the **Fast-Forward Lifecycle Simulator** dropdown preloaded with 25 groups across 6 lifecycle stages.

#### Step 2: Enter as Buyer (Sanjay Jagtap)
- **Action:** Click **"Enter as Buyer"** on the Buyer card. The browser redirects to `http://localhost:3000/`.
- **Presenter Narrative:**
  > *"We are logged in as Sanjay Jagtap, an agribusiness owner from Baramati in Pune district. Notice the clean, high-contrast Red & White brand tokens built for rural readability under bright sunlight."*
- **Key Features to Highlight:**
  1. **Language Switcher (Top Header):**
     - Click **"मराठी"** or **"हिंदी"**. Notice all labels, badges, and copy dynamically adapt to vernacular Marathi/Hindi while preserving standard INR currency formatting (`₹18.45 Lakhs`).
     - Switch back to English or keep Marathi.
  2. **Three-Step Onboarding Walkthrough:**
     - Click **"How It Works"**. Demonstrate the modal explaining:
       - Step 1: Form or join a local taluka group.
       - Step 2: Dealerships submit blind sealed bids.
       - Step 3: Members vote and lock institutional group discounts.
  3. **Multilingual AI Car Advisor:**
     - Click the floating **"Car Advisor"** widget in the bottom-right corner.
     - Type a Hinglish/Marathi query:
       `"Baramati road sathi 15 te 20 lakh madhe diesel SUV sanga"`
     - Observe the streaming hybrid RAG response citing ground clearance, suspension suitability for rural roads, and active buying groups in Western Maharashtra.

---

### Minutes 02:00 – 04:00: Dealership Hub, KYB Verification & Territorial Demand

#### Step 1: Switch to Seller Portal
- **Action:** Open a new tab or click the **"Demo Hub"** pill to go to `http://localhost:3001/`.
- **Presenter Narrative:**
  > *"Now let's switch hats to an authorized dealer: Sahyadri Automotive Group in Baramati, authorized for Mahindra and Tata Motors. Dealerships must clear a strict KYB verification gate and pay a one-time ₹19,999 registration fee before viewing customer demand or submitting quotes."*

#### Step 2: Explore Regional Demand by Zone
- **Action:** Click the **"Regional Demand by Zone"** tab.
- **Presenter Narrative:**
  > *"Before reverse bidding opens, dealerships can see live demand cohorts forming in their authorized talukas. Here we see 7 prospective buyers in Baramati grouping for the Mahindra Scorpio-N Z8 Diesel."*
- **Key Metrics to Highlight:**
  - **Zone:** Baramati Taluka (Rural Tier-3 Cluster).
  - **Estimated Order Value:** ₹1.47 Crores aggregated demand.
  - **Quorum Progress:** 7 / 10 buyers joined (70% fill rate).
  - Dealerships can plan allocation and negotiate factory quota discounts with OEMs ahead of time.

#### Step 3: Bulk Inventory Importer (Clearance & Demo Stock)
- **Action:** Click the **"Bulk Inventory Importer (CSV)"** tab.
- **Presenter Narrative:**
  > *"Car dealers often have aged inventory or demo vehicles tying up working capital. GroupDrive provides an Offered Vehicles marketplace with automated fraud checks: duplicate VIN detection, odometer thresholds for demo cars, and pricing guardrails."*
- **Action:** Click **"Download Sample Template"** or inspect the uploaded demo inventory cards.

---

### Minutes 04:00 – 06:00: Fast-Forward Engine — Quorum & Sealed Reverse Auction

#### Step 1: Return to Demo Hub
- **Action:** Navigate back to `http://localhost:3000/demo`.
- **Presenter Narrative:**
  > *"Now let’s fast-forward time to simulate the competitive reverse bidding process without waiting days for deadlines to lapse."*

#### Step 2: Fast-Forward Step 1 — Fill Quorum
- **Action:** In the group dropdown, select a group with status `[FORMING]` (e.g. `Mahindra Scorpio-N — Baramati Taluka`).
- **Action:** Click **"⚡ 1. Fill Quorum"**.
- **Expected Result:**
  - Status badge updates immediately to **`2. Quorum Reached`** or **`3. RFQ Bidding Open`**.
  - Success banner: *"Quorum achieved! RFQ opened. Reverse bidding active for 72 hours."*

#### Step 3: Fast-Forward Step 2 — Close Bids & Unseal Quotes
- **Action:** Click **"⚡ 2. Close Bids"**.
- **Presenter Narrative:**
  > *"During the 72-hour window, dealer bids remain cryptographically sealed. Neither competing dealers nor platform admins can view raw quotes to prevent collusion. When the timer expires, the landed-cost engine unseals all bids and ranks them by lowest total landed cost."*
- **Expected Result:**
  - Status badge transitions to **`4. Buyer Voting Open`**.
  - Quotes are unsealed and displayed with full landed cost line items (ex-showroom, statutory RTO road tax, TCS, insurance, and group discount).

---

### Minutes 06:00 – 08:00: Democratic Member Voting, Booking & Doorstep Delivery

#### Step 1: Fast-Forward Step 3 — Resolve Member Vote & Lock Deal
- **Action:** Click **"⚡ 3. Resolve Vote"**.
- **Presenter Narrative:**
  > *"In GroupDrive, democracy drives the deal. Every group member casts one vote. If the winning quote secures over 50% majority, the group status moves to DEAL_LOCKED and individual buyer bookings are generated with ₹25,000 escrow token holds."*
- **Expected Result:**
  - Status badge updates to **`5. Deal Locked (Booked)`**.
  - 10 confirmed booking vouchers created in the double-entry ledger.

#### Step 2: Fast-Forward Step 4 — Settle Deal & Doorstep Handover
- **Action:** Click **"⚡ 4. Settle Deal"**.
- **Presenter Narrative:**
  > *"The dealership prepares PDI, verifies rural doorstep delivery with GPS coordinates and buyer OTP confirmation. Upon delivery sign-off, GroupDrive’s automated settlement engine deducts the 1% platform commission (+ 18% GST) and disburses the net payout to the dealership subledger."*
- **Expected Result:**
  - Status badge transitions to **`6. Delivered & Settled`**.
  - Success banner: *"All units delivered, 1% commission deducted, seller receivable settled, and reviews captured."*

---

### Minutes 08:00 – 10:00: Super Admin Console, Live Ops & Financial Ledger Audit

#### Step 1: Switch to Admin Console
- **Action:** Navigate to `http://localhost:3002/`.
- **Presenter Narrative:**
  > *"Finally, let’s inspect the platform operations and financial integrity console at port 3002."*

#### Step 2: Live Ops Telemetry
- **Action:** Click **"Live Ops"** tab.
- **Key Metrics to Highlight:**
  - **GMV Transacted:** ₹2.03+ Crores across Maharashtra, MP, and Karnataka cohorts.
  - **Average Group Discount:** 8.4% savings against single-buyer retail MSRP.
  - **Dispute Rate:** Zero active disputes.
  - **Active RFQs & Groups Breakdown:** Real-time visual count by lifecycle phase.

#### Step 3: Role-Based Access Control (RBAC) Switcher
- **Action:** Click between **ADMIN**, **SUPPORT**, **FINANCE**, and **CATALOG** role pills in the top header.
- **Presenter Narrative:**
  > *"Notice how the navigation bar dynamically enforces RBAC. A Support agent can view buyer context and ticket notes but cannot alter tax slabs or approve KYB. A Finance officer has full access to the ledger explorer."*

#### Step 4: Double-Entry Ledger Explorer
- **Action:** Select **FINANCE** role and click the **"Financial Ledger"** tab.
- **Presenter Narrative:**
  > *"GroupDrive enforces strict double-entry GAAP/Ind-AS accounting. We do not store single balances; every rupee moved is an immutable debit-credit pair with integer-paise precision to eliminate floating-point drift."*
- **Action:** Open terminal in VS Code and run:
  ```bash
  pnpm reconcile
  ```
- **Show Evaluators:**
  - Total Debits: `₹2,03,71,853.48` exactly equals Total Credits: `₹2,03,71,853.48`.
  - Zero balance mismatches.
  - Zero sequence gaps across all 252 ledger entries.

---

## 4. Fallback & Troubleshooting Matrix

| Scenario / Issue | Cause | Immediate Fallback Action |
| :--- | :--- | :--- |
| **API returns `ECONNRESET`** | PGlite single-writer connection held | Restart embedded server: `node packages/db/scripts/server.js` |
| **Group button says "Action not allowed"** | Group is not in expected state for that button | Use the **"Reset"** button on the Demo Hub card or select another pre-seeded group |
| **Port 3000 / 3001 / 3002 busy** | Previous node process still running | Run `Get-Process node \| Stop-Process -Force` in PowerShell, then restart servers |
| **AI Advisor chat unresponsive** | Python `ai-service` not started | Run `python -m uvicorn app.main:app --port 8000` in `apps/ai-service` |
| **Want a completely fresh slate** | Presenter wants to re-run demo from scratch | Run `pnpm seed:demo` in terminal. It takes ~15 seconds to recreate all 25 groups |

---

## 5. Key Talking Points for Q&A

1. **Why rural buyers?**
   - In rural India, buyers purchase through community reference networks (relatives, farmer cooperatives, trade unions). GroupDrive turns informal referral behavior into structured buying power.
2. **Why do dealerships participate?**
   - Dealerships acquire 8-15 verified, finance-ready buyers in a single stroke, drastically lowering their customer acquisition cost (CAC) and inventory holding duration.
3. **How does GroupDrive prevent bid shilling?**
   - Cryptographically sealed bidding, randomized quote display during voting, and strict blind auctions until quorum close prevent collusion.
4. **How is platform revenue generated?**
   - Dealership one-time KYB onboarding fee (₹19,999) + 1% gross transaction commission on delivered vehicles.
