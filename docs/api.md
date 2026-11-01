# 🔌 GroupDrive API Reference & OpenAPI 3.1.0 Specification

Welcome to the **GroupDrive Core API Gateway** specification. This document outlines the RESTful endpoints, WebSocket real-time event subscriptions, authentication schemes, error formats, and OpenAPI 3.1 schemas partitioned by role (**Buyer**, **Seller**, and **Admin**).

---

## 1. Global Conventions & Standards

### Base URLs

| Environment | Base URL | Transport |
|:---|:---|:---|
| **Local Development** | `http://localhost:4000/api` | HTTP / WebSocket (`ws://localhost:4000`) |
| **Local AI Service** | `http://127.0.0.1:8000` | HTTP / SSE |
| **Local MCP Server** | `http://localhost:3005` | JSON-RPC 2.0 over HTTP / Stdio |
| **Staging** | `https://staging-api.groupdrive.in/api` | HTTPS / WSS |
| **Production** | `https://api.groupdrive.in/api` | HTTPS / WSS |

### Authentication Headers

All protected endpoints require a cryptographic Bearer token or gateway identity header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-buyer-id: usr_buy_satara_001      # In Buyer context
x-seller-id: slr_apex_pune_001      # In Seller context
x-admin-role: SUPER_ADMIN           # In Admin context (SUPER_ADMIN | RISK_OPS | FINANCE)
```

### Standard Response Envelope

All API responses follow a consistent envelope structure:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-01T12:00:00.000Z",
    "requestId": "req_01HZX89J4P2K3",
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalRecords": 142,
      "totalPages": 8,
      "hasMore": true,
      "nextCursor": "eyJsYXN0SWQiOiJncnBfMTI4OSJ9"
    }
  }
}
```

### Error Format (RFC 7807 Compliant)

Errors return RFC 7807 problem details with localized error messages:

```json
{
  "success": false,
  "error": {
    "code": "ERR_QUORUM_NOT_MET",
    "message": "Group has not yet reached the required buyer quorum of 5 members.",
    "status": 400,
    "details": [
      {
        "field": "currentSize",
        "issue": "Requires at least 5 members; currently has 3."
      }
    ],
    "timestamp": "2026-11-01T12:00:00.000Z",
    "requestId": "req_01HZX89J4P2K3"
  }
}
```

---

## 2. Buyer API Endpoints

The Buyer API powers the public discovery portal, taluka demand aggregation, cohort membership, multilingual vehicle advisory, democratic voting, and doorstep delivery confirmation.

### 2.1 Vehicle Catalog & Regional Zones

#### `GET /catalog/brands`
Retrieves all authorized automobile brands available for group buying.
- **Auth**: Public
- **Response**: Array of `CatalogBrand` objects with model count and logo URLs.

#### `GET /catalog/models?brandId={brandId}&bodyType={bodyType}`
Filters vehicle models by brand, body type (`SUV`, `EV`, `HATCHBACK`, `SEDAN`), and price range.
- **Auth**: Public
- **Response**: Array of models with starting ex-showroom prices in integer paise.

#### `GET /zones/hierarchy?state=MH&district=Satara`
Returns talukas, pin codes, and density classifications (`METRO`, `RURAL`, `DEEP_RURAL`) for the target delivery zone.
- **Auth**: Public

---

### 2.2 Cohort Formation & Membership

#### `GET /groups?talukaId={id}&modelId={id}&status=FORMING`
Lists open buyer cohorts in or adjacent to the user's taluka cluster.
- **Auth**: Public
- **Query Params**:
  - `talukaId` (string, optional)
  - `status` (`DRAFT`, `FORMING`, `QUORUM_REACHED`, `RFQ_ACTIVE`, `VOTING_OPEN`, `DEAL_LOCKED`)
  - `cursor` (string, optional)
  - `limit` (int, default: 20)

#### `POST /groups`
Creates a new buyer cohort for a specific vehicle variant in a delivery zone.
- **Auth**: `Bearer <buyer_token>`
- **Request Body**:
```json
{
  "variantId": "var_nexon_ev_fearless_plus",
  "zoneId": "zone_satara_taluka",
  "targetQuorum": 5,
  "deadlineDays": 14
}
```

#### `POST /groups/:groupId/join`
Enrolls the authenticated buyer into an existing cohort.
- **Auth**: `Bearer <buyer_token>`
- **Response**: `Membership` record with active status and current group quorum count.

---

### 2.3 RFQ Quotes & Democratic Voting

#### `GET /groups/:groupId/rfq/quotes`
Retrieves normalized dealer quotes once the RFQ enters `VOTING_OPEN` status.
- **Auth**: `Bearer <buyer_token>` (Must be an active member of the cohort)
- **Response**: Side-by-side array of normalized dealer quotes, detailing ex-showroom, RTO road tax, zero-dep insurance, optional accessories, and doorstep flat-bed freight charges.

#### `POST /groups/:groupId/rfq/vote`
Casts the buyer's democratic vote for the preferred dealer quote.
- **Auth**: `Bearer <buyer_token>`
- **Request Body**:
```json
{
  "quoteId": "qte_apex_nexon_01"
}
```

---

### 2.4 Token Booking & Delivery Confirmation

#### `POST /bookings/create-intent`
Generates a payment intent to hold the ₹10,000 refundable booking token in escrow.
- **Auth**: `Bearer <buyer_token>`
- **Response**: Gateway client secret and double-entry escrow transaction ID.

#### `POST /bookings/:bookingId/confirm-delivery`
Confirms physical delivery of the vehicle at the buyer's taluka using the 6-digit delivery OTP.
- **Auth**: `Bearer <buyer_token>`
- **Request Body**:
```json
{
  "otp": "492810",
  "pdiAccepted": true,
  "remarks": "Vehicle delivered in pristine condition with all accessories."
}
```

---

## 3. Seller (Dealer) API Endpoints

The Seller API enables authorized dealerships to monitor live taluka demand heatmaps, submit cryptographically sealed bids for open RFQs, manage stock inventory, and inspect settlement receivables.

### 3.1 Dealer Onboarding & KYB

#### `POST /sellers/kyb/submit`
Submits dealer corporate credentials, GSTIN, dealership franchise agreements, and cancelled bank cheques.
- **Auth**: `Bearer <seller_token>`
- **Request Body (Multipart Form)**:
  - `gstin`: string (15 characters)
  - `pan`: string (10 characters)
  - `franchiseBrands`: `["TATA", "MAHINDRA"]`
  - `documentFiles`: Binary PDF attachments

---

### 3.2 Regional Demand & Sealed Bidding

#### `GET /sellers/analytics/regional-demand`
Returns geospatial buyer demand heatmaps aggregated across districts and talukas.
- **Auth**: `Bearer <seller_token>` (Must be KYB `VERIFIED`)
- **Response**: Array of demand clusters with vehicle variant preferences, quorum proximity, and historical conversion rates.

#### `GET /rfqs/open`
Lists active RFQs open for dealer quotation matching the dealer's brand authorizations.
- **Auth**: `Bearer <seller_token>`

#### `POST /rfqs/:rfqId/quotes`
Submits an immutable, cryptographically sealed quotation with itemized line costs.
- **Auth**: `Bearer <seller_token>`
- **Request Body**:
```json
{
  "exShowroomPaise": 149900000,
  "logisticsPaise": 1500000,
  "rtoTaxPaise": 18240000,
  "insurancePaise": 5500000,
  "accessoriesPaise": 1200000,
  "discountPaise": 8500000,
  "deliveryTimelineDays": 10,
  "stockAvailabilityType": "ALLOCATED_VIN"
}
```

---

### 3.3 Deal Fulfillment & Inventory Management

#### `POST /bookings/:bookingId/allocate-chassis`
Assigns the vehicle factory chassis number (VIN) and engine serial number to a locked booking.
- **Auth**: `Bearer <seller_token>`

#### `POST /sellers/inventory/import-csv`
Bulk imports dealer clearance stock or special demo inventory.
- **Auth**: `Bearer <seller_token>`
- **Request Body**: Multi-part CSV file with variant IDs, VIN numbers, manufacturing year, and clearance price discounts.

---

## 4. Admin API Endpoints

The Admin API powers the centralized Platform Control Room for live ops telemetry, dealer KYB approvals, listing moderation, financial ledger auditing, dispute resolution, and demo simulation.

### 4.1 Live Operations Telemetry

#### `GET /admin/live-ops/metrics`
Streams real-time metrics on active groups, RFQs in bidding, conversion rates, and gross merchandise volume (GMV).
- **Auth**: `Bearer <admin_token>` | Requires `VIEW_LIVE_OPS`
- **Response**:
```json
{
  "activeGroupsCount": 25,
  "rfqsInBidding": 7,
  "dealsLockedMonth": 64,
  "totalGmvPaise": 95936000000,
  "platformRevenuePaise": 959360000,
  "activeDealersCount": 15
}
```

---

### 4.2 KYB & Listing Moderation

#### `GET /admin/kyb/pending`
Lists dealer applications awaiting legal and document review.
- **Auth**: `Bearer <admin_token>` | Requires `VIEW_KYB_QUEUE`

#### `POST /admin/kyb/:sellerProfileId/approve`
Approves dealer KYB, enabling RFQ participation and catalog inventory listing.
- **Auth**: `Bearer <admin_token>` | Requires `APPROVE_REJECT_KYB`

#### `POST /admin/moderation/offers/:offerId/approve`
Moderates and approves dealer clearance inventory before public display on buyer apps.
- **Auth**: `Bearer <admin_token>` | Requires `APPROVE_REJECT_LISTING`

---

### 4.3 Financial Ledger & Settlements

#### `GET /admin/finance/summary`
Returns total escrow deposits held, platform commission accrued (1%), and processed dealer payouts.
- **Auth**: `Bearer <admin_token>` | Requires `VIEW_FINANCE`

#### `GET /admin/finance/ledger?page=1&pageSize=20`
Paginated audit trail of all immutable double-entry ledger entries.
- **Auth**: `Bearer <admin_token>` | Requires `VIEW_FINANCE`

#### `GET /admin/finance/ledger/export`
Exports the entire append-only financial ledger as an RFC 4180 CSV spreadsheet.
- **Auth**: `Bearer <admin_token>` | Requires `EXPORT_LEDGER_CSV`

---

### 4.4 Guided Demo & Fast-Forward Timers

#### `POST /admin/demo/fast-forward/threshold/:groupId`
Instantly simulates quorum threshold completion for the targeted cohort.

#### `POST /admin/demo/fast-forward/close-bidding/:groupId`
Instantly terminates the 48-hour bidding clock and unseals all submitted dealer quotes.

#### `POST /admin/demo/fast-forward/complete-delivery/:groupId`
Simulates delivery carrier dispatch, buyer PDI acceptance, and OTP confirmation.

---

## 5. Real-Time WebSocket Event Protocol

The GroupDrive WebSocket gateway runs on `ws://localhost:4000/events` and broadcasts real-time lifecycle transitions using JSON-RPC framed payloads.

### Connection Handshake
```javascript
const ws = new WebSocket('ws://localhost:4000/events');
ws.send(JSON.stringify({
  action: 'SUBSCRIBE',
  channel: 'group_nexon_satara_01',
  token: 'Bearer <jwt_token>'
}));
```

### Event Catalog

| Event Name | Topic / Channel | Payload Schema | Description |
|:---|:---|:---|:---|
| `group.member_joined` | `group_{groupId}` | `{ memberCount: 4, target: 5, memberName: "Rohan S." }` | Fired when a buyer joins the cohort. |
| `group.quorum_reached` | `group_{groupId}` | `{ groupId: "...", rfqId: "...", rfqDeadline: "..." }` | Fired when the group hits target size. |
| `rfq.bids_opened` | `group_{groupId}` | `{ rfqId: "...", quotesCount: 4 }` | Broadcast to cohort when bidding window closes. |
| `quote.submitted` | `seller_{sellerId}` | `{ quoteId: "...", rfqId: "...", status: "SEALED" }` | Confirmation sent to dealer upon sealed bid submission. |
| `deal.locked` | `group_{groupId}` | `{ winningQuoteId: "...", winningDealer: "Apex Tata" }` | Fired when voting concludes with majority winner. |
| `booking.status_changed` | `user_{userId}` | `{ bookingId: "...", status: "CHASSIS_ALLOCATED", vin: "MAT612..." }` | Live updates on vehicle allocation & dispatch. |
| `settlement.processed` | `admin_finance` | `{ settlementId: "...", amountPaise: 990000, commissionPaise: 10000 }` | Broadcast to finance operators upon ledger payout. |

---

## 6. Complete OpenAPI 3.1.0 Specification (YAML)

```yaml
openapi: 3.1.0
info:
  title: GroupDrive Core Platform API
  version: 1.0.0
  description: Official OpenAPI 3.1 specification for GroupDrive collective buying, sealed-bid reverse auctions, and double-entry settlement.
servers:
  - url: http://localhost:4000/api
    description: Local Development Server
  - url: https://api.groupdrive.in/api
    description: Production API Gateway

paths:
  /health:
    get:
      summary: Health check endpoint
      description: Returns liveness, uptime, and database connectivity.
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                type: object
                properties:
                  status: { type: string, example: "ok" }
                  uptimeSeconds: { type: integer, example: 3600 }
                  timestamp: { type: string, format: date-time }

  /groups:
    get:
      summary: List buyer groups
      parameters:
        - name: talukaId
          in: query
          schema: { type: string }
        - name: status
          in: query
          schema: { type: string, enum: [DRAFT, FORMING, QUORUM_REACHED, RFQ_ACTIVE, VOTING_OPEN, DEAL_LOCKED, COMPLETED] }
      responses:
        '200':
          description: Array of groups
    post:
      summary: Create a new buyer group
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [variantId, zoneId, targetQuorum]
              properties:
                variantId: { type: string }
                zoneId: { type: string }
                targetQuorum: { type: integer, minimum: 2, maximum: 50 }
                deadlineDays: { type: integer, default: 14 }
      responses:
        '201':
          description: Group created successfully

  /rfqs/{rfqId}/quotes:
    post:
      summary: Submit a sealed dealer quote
      security:
        - BearerAuth: []
      parameters:
        - name: rfqId
          in: path
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [exShowroomPaise, logisticsPaise, rtoTaxPaise, insurancePaise]
              properties:
                exShowroomPaise: { type: integer, format: int64 }
                logisticsPaise: { type: integer, format: int64 }
                rtoTaxPaise: { type: integer, format: int64 }
                insurancePaise: { type: integer, format: int64 }
                accessoriesPaise: { type: integer, format: int64 }
                discountPaise: { type: integer, format: int64 }
                deliveryTimelineDays: { type: integer }
      responses:
        '201':
          description: Quote sealed and stored

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```
