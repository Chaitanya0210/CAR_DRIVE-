# GroupDrive State Machines Specification & Transition Tables

This document defines the formal finite-state machines (FSM) governing all core domain entities in GroupDrive. All state transitions must adhere strictly to the allowed transition tables. Any attempted transition outside these paths throws an `IllegalStateTransitionError` and is rejected with an HTTP 400 Bad Request.

---

## 1. Group State Machine

Governs the lifecycle of buyer cohorts forming in a specific taluka/cluster.

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> OPEN: Group Launched / Published
    DRAFT --> CANCELLED: Creator Aborts
    
    OPEN --> THRESHOLD_MET: Quorum Size Met
    OPEN --> EXPIRED: Deadline Passed without Quorum
    OPEN --> CANCELLED: Admin / Creator Cancelled
    OPEN --> MERGED: Merged into Adjacent Cluster
    
    THRESHOLD_MET --> RFQ_OPEN: Scheduled Job Opens Sealed Auction
    THRESHOLD_MET --> OPEN: Member Withdrew (Quorum Drops)
    THRESHOLD_MET --> CANCELLED: Cancelled
    
    RFQ_OPEN --> QUOTES_CLOSED: 48h Window Expires
    RFQ_OPEN --> CANCELLED: Platform Abort
    
    QUOTES_CLOSED --> VOTING: Quotes Unmasked & Normalized
    QUOTES_CLOSED --> RFQ_OPEN: Zero Quotes Received (Auto-Extend)
    QUOTES_CLOSED --> EXPIRED: No Quotes after Extension
    
    VOTING --> WINNER_SELECTED: Majority / Tie-Breaker Vote Confirmed
    VOTING --> RFQ_OPEN: Re-Run Auction (Cohort Rejects All)
    VOTING --> CANCELLED: Cancelled
    
    WINNER_SELECTED --> BOOKING: Winning Dealer Locked, Deposit Window Open
    WINNER_SELECTED --> VOTING: Winning Dealer Withdraws (Fallback to 2nd)
    
    BOOKING --> COMPLETED: All Members Paid Deposit & Allocated
    BOOKING --> CANCELLED: Dealer Default / Quorum Collapse
    
    COMPLETED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
    MERGED --> [*]
```

### Transition Table: Group

| Current State (`From`) | Allowed Next States (`To`) | Trigger / Guard Condition |
| :--- | :--- | :--- |
| `DRAFT` | `OPEN`, `CANCELLED` | Validation of brand, model, target size, and delivery zone. |
| `OPEN` | `THRESHOLD_MET`, `EXPIRED`, `CANCELLED`, `MERGED` | `currentSize >= targetSize` triggers `THRESHOLD_MET`. Deadline triggers `EXPIRED`. Cluster merge triggers `MERGED`. |
| `THRESHOLD_MET` | `RFQ_OPEN`, `OPEN`, `CANCELLED` | Reverse auction engine triggers `RFQ_OPEN`. If a member withdraws before RFQ opens and `currentSize < targetSize`, status drops back to `OPEN`. |
| `RFQ_OPEN` | `QUOTES_CLOSED`, `CANCELLED` | BullMQ scheduled worker evaluates 48-hour bidding deadline. |
| `QUOTES_CLOSED` | `VOTING`, `RFQ_OPEN`, `EXPIRED` | If quotes >= 1, unseal and normalize into `VOTING`. If 0 quotes, extend window or re-run. |
| `VOTING` | `WINNER_SELECTED`, `RFQ_OPEN`, `CANCELLED` | Voting concludes with winning quote chosen. In case of tie, earliest submitted quote wins. |
| `WINNER_SELECTED` | `BOOKING`, `VOTING` | If winning dealer withdraws, fallback to runner-up quote. Otherwise, proceed to `BOOKING`. |
| `BOOKING` | `COMPLETED`, `CANCELLED` | Members complete individual booking deposits. |
| `COMPLETED` | (None) | Terminal state. |
| `EXPIRED` | (None) | Terminal state. |
| `CANCELLED` | (None) | Terminal state. |
| `MERGED` | (None) | Terminal state. |

---

## 2. RFQ & Sealed Bidding State Machine

Governs the dealer reverse-auction window.

```mermaid
stateDiagram-v2
    [*] --> OPEN: Group Hits Quorum Threshold
    OPEN --> OPEN: Dealer Revises Quote (Before Window Close)
    OPEN --> CLOSED: 48-Hour Bidding Window Closes
    OPEN --> CANCELLED: Group Cancelled / Threshold Dropped
    
    CLOSED --> AWARDED: Winner Selected by Buyer Cohort
    CLOSED --> OPEN: Zero Bids Extension
    CLOSED --> CANCELLED: All Quotes Disqualified / Cancelled
    
    AWARDED --> [*]
    CANCELLED --> [*]
```

---

## 3. Quote State Machine

Governs dealer bids with sealed privacy and cryptographic integrity.

```mermaid
stateDiagram-v2
    [*] --> SEALED: Dealer Submits Quote
    SEALED --> SEALED: Dealer Revises Quote (Pre-Close)
    SEALED --> UNMASKED: Bidding Window Closes (Decrypted)
    SEALED --> REJECTED: Dealer Withdraws
    
    UNMASKED --> WINNER: Cohort Selects Dealer Bid
    UNMASKED --> REJECTED: Cohort Selects Competitor
    
    WINNER --> [*]
    REJECTED --> [*]
```

---

## 4. Booking & Shipment Delivery State Machine

Governs individual vehicle procurement, logistics tracking, and handover.

```mermaid
stateDiagram-v2
    [*] --> ORDER_PLACED: Individual ₹25,000 Deposit Held
    ORDER_PLACED --> DISPATCHED: Dealer Assigns VIN & Flatbed
    ORDER_PLACED --> CANCELLED: Dealer Default / Cancellation
    
    DISPATCHED --> IN_TRANSIT: Transit Telematics Active
    DISPATCHED --> CANCELLED: Transit Loss / Incident
    
    IN_TRANSIT --> ARRIVED_AT_HUB: Arrived at Taluka Delivery Hub
    IN_TRANSIT --> DISPUTED: Shipment Delay Past SLA
    
    ARRIVED_AT_HUB --> DELIVERED: Buyer PDI (<100 km) & OTP Verification
    ARRIVED_AT_HUB --> DISPUTED: PDI Failure / Damage Reported
    
    DELIVERED --> [*]
    DISPUTED --> DELIVERED: Dispute Resolved & Replaced
    DISPUTED --> CANCELLED: Order Cancelled & Refunded
    CANCELLED --> [*]
```

---

## 5. Seller KYB Verification State Machine

Governs dealer onboarding, document verification, and fee payment gating.

```mermaid
stateDiagram-v2
    [*] --> REGISTERED: Dealership User Signs Up
    REGISTERED --> KYB_SUBMITTED: GSTIN, PAN, & Dealership Certs Uploaded
    
    KYB_SUBMITTED --> VERIFIED: Admin Verifies Business Credentials
    KYB_SUBMITTED --> REJECTED: Admin Rejects with Mandatory Reason
    
    REJECTED --> KYB_SUBMITTED: Dealer Re-uploads Corrected Documents
    
    VERIFIED --> ACTIVE: Registration Fee (₹19,999 + GST) Paid
    
    ACTIVE --> SUSPENDED: Violation / Fraud Detected
    SUSPENDED --> ACTIVE: Admin Reinstatement
    
    ACTIVE --> [*]
```

---

## 6. Money & Ledger State Machine

Governs all cash movements under the append-only ledger constraint.

```mermaid
stateDiagram-v2
    [*] --> INITIATED: Payment Gateway Session Created
    INITIATED --> HELD: Payment Captured (Held Pending Delivery)
    INITIATED --> FAILED: Payment Aborted / Expired
    
    HELD --> RELEASED: Confirmed Delivery (Split Settlement T+1)
    HELD --> REFUNDED: Order Cancelled / Dealer Default
    HELD --> DISPUTED: Delivery Disputed by Buyer
    
    DISPUTED --> RELEASED: Admin Settlement Resolution
    DISPUTED --> REFUNDED: Admin Full Refund
    
    RELEASED --> [*]
    REFUNDED --> [*]
    FAILED --> [*]
```
