# Landed-Cost Normalization Engine: Specification & Formula Documentation

## 1. Executive Overview

In conventional Indian automotive retail, dealerships frequently advertise attractive headline discounts on ex-showroom prices while silently padding on-road prices with mandatory handling fees, inflated documentation charges, proprietary accessory bundles, and marked-up insurance quotes.

**GroupDrive eliminates this asymmetry** through an automated, pure **Landed-Cost Engine** (`@groupdrive/shared/landed-cost`). In every reverse auction, dealer bids are normalized to the buyer cohort's exact delivery taluka/cluster. Buyers vote on and commit to the **total landed on-road cost** at their doorstep, with every statutory and logistics component itemized down to integer paise.

---

## 2. Mathematical Formula

The total landed on-road cost for an individual group member is defined by the deterministic formula:

$$\text{TotalLandedCostPaise} = P_{\text{ex}} + T_{\text{rto}} + I_{\text{ins}} + C_{\text{cess}} + L_{\text{log}} + T_{\text{tcs}} - D_{\text{grp}}$$

Where:
* $P_{\text{ex}}$: Manufacturer Ex-Showroom Price (paise)
* $T_{\text{rto}}$: State Road Tax / RTO Registration Levy (paise)
* $I_{\text{ins}}$: Comprehensive Motor Insurance Estimate (1-Yr OD + 3-Yr TP statutory cover) (paise)
* $C_{\text{cess}}$: FASTag issuance, smart card fees, and statutory road safety cess (paise)
* $L_{\text{log}}$: Insured carrier/flatbed doorstep transport from dealer yard to buyer cluster (paise)
* $T_{\text{tcs}}$: Tax Collected at Source under Section 206C(1F) of the Income Tax Act (paise)
* $D_{\text{grp}}$: Reverse auction batch group discount offered by the winning dealership (paise)

---

## 3. Basis Points & Exact Integer Paise Arithmetic

Floating-point numbers (`0.1`, `0.2`) produce binary representation errors in JavaScript/V8 engines (e.g. `0.1 + 0.2 = 0.30000000000000004`). In GroupDrive:
1. **All amounts are stored as integer paise** ($1\text{ INR} = 100\text{ paise}$).
2. **All percentage rates are modeled as integer Basis Points** ($1\text{ basis point (bp)} = 0.01\% = \frac{1}{10,000}$).
3. **Statutory Half-Up Rounding Rule**:
   $$\text{roundBps}(P, \text{bps}) = \left\lfloor \frac{P \times \text{bps} + 5000}{10,000} \right\rfloor$$
   This prevents rounding drift and ensures exact rupee conservation.

---

## 4. StateTaxConfig Schema & Statutory Rates

State road taxes in India are progressive and vary by state of registration, fuel category, and price bracket. Tax configurations are persisted in `StateTaxConfig`:

```prisma
model StateTaxConfig {
  id                String          @id @default(uuid())
  zoneId            String
  fuelType          VehicleFuelType
  minPricePaise     BigInt
  maxPricePaise     BigInt
  taxPercent        Decimal         @db.Decimal(5, 2)
  flatFeePaise      BigInt          @default(0)
  needsVerification Boolean         @default(true)
}
```

### Statutory Schedules Matrix

| State | Fuel Type | Slab / Conditions | Statutory Rate (bps) | Rate (%) | Audit Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Maharashtra (MH)** | Petrol | Up to ₹10,00,000 | 1100 bps | 11.00% | `[needs_verification]` |
| **Maharashtra (MH)** | Petrol | ₹10,00,001 to ₹20,00,000 | 1200 bps | 12.00% | `[needs_verification]` |
| **Maharashtra (MH)** | Diesel | Up to ₹10,00,000 | 1300 bps | 13.00% | `[needs_verification]` |
| **Maharashtra (MH)** | Diesel | Above ₹10,00,000 | 1400 bps | 14.00% | `[needs_verification]` |
| **Maharashtra (MH)** | EV (Electric) | All price slabs | 0 bps | 0.00% | `[needs_verification]` (State EV Policy waiver) |
| **Maharashtra (MH)** | CNG | Factory-fitted | 700 bps | 7.00% | `[needs_verification]` |
| **Madhya Pradesh (MP)** | Petrol | All price slabs | 900 bps | 9.00% | `[needs_verification]` |
| **Madhya Pradesh (MP)** | Diesel | All price slabs | 1000 bps | 10.00% | `[needs_verification]` |
| **Karnataka (KA)** | Petrol / Diesel | Above ₹10,00,000 | 1400 bps | 14.00% | `[needs_verification]` (Includes infra cess) |

---

## 5. Section 206C(1F) TCS (Tax Collected at Source)

Under Section 206C(1F) of the Income-Tax Act, 1961:
> *"Every person, being a seller, who receives any amount as consideration for sale of a motor vehicle of the value exceeding ten lakh rupees, shall, at the time of receipt of such amount, collect from the buyer a sum equal to 1 per cent of the sale consideration as income-tax."*

### Application Rules:
* **Threshold**: Strictly $> ₹10,00,000$ (100,000,000 paise).
* **Boundary Condition**: At exactly $₹10,00,000$ ($100,000,000$ paise), $T_{\text{tcs}} = 0$. At $₹10,00,001$ ($100,000,100$ paise), $T_{\text{tcs}} = 10,000.01\text{ INR} \rightarrow 1,000,001\text{ paise}$. `[needs_verification]`
* **Rate**: 100 basis points ($1.00\%$).
* **Buyer Credit**: TCS is credited against the buyer's Form 26AS / AIS upon dealer quarterly filing.

---

## 6. Insurance & Statutory Bundle Assumptions

1. **Insurance Package**: Standard OEM Comprehensive Cover (1-Year Own Damage + 3-Year Third Party IRDAI mandatory cover). Calculated as standard 350 basis points (3.50%) of Ex-Showroom / IDV `[needs_verification]`.
2. **Statutory Cess & FASTag**:
   * FASTag RFID tag issuance + security deposit: ₹500
   * State Road Safety Cess + Smart Card Registration Certificate: ₹2,000
   * Total Standard: ₹2,500 (250,000 paise) `[needs_verification]`.
3. **Logistics & Regional Delivery**:
   * Local dealer hub pickup: ₹0
   * Intra-cluster flatbed transport (< 100 km): ₹4,000 - ₹8,000 `[needs_verification]`
   * Regional inter-district carrier (100 - 300 km): ₹10,000 - ₹18,000 `[needs_verification]`
   * Inter-state line-haul (> 300 km): ₹18,000 - ₹25,000 `[needs_verification]`

---

## 7. Rule-Based Hidden Charges Detector

Dealerships submit quotes with granular fee structures. The engine runs rule-based fraud and markup flags before quotes are exposed to voting:

| Flag Code | Threshold Condition | Reason | Severity |
| :--- | :--- | :--- | :--- |
| `DOCUMENTATION_FEE_DISGUISE` | FASTag/Cess $> ₹5,000$ | Dealers disguising prohibited "handling/logistics" fees under statutory headers | `WARNING` |
| `INFLATED_INSURANCE` | Insurance $> 5.0\%$ of Ex-Showroom | Dealership inflating insurance margin above standard IRDAI broker rates | `WARNING` |
| `EXCESSIVE_LOGISTICS` | Regional Freight $> ₹25,000$ | Inflated transport charge eroding group discount value | `WARNING` |
| `PREDATORY_DISCOUNT_ANOMALY` | Group Discount $> 35.0\%$ | Unrealistic discount signaling bait-and-switch or cancelled vehicle units | `ALERT` |

---

## 8. Worked Examples Verification Matrix (11 Scenarios)

All 11 scenarios are codified and verified in `packages/shared/src/__tests__/landed-cost-table.test.ts`:

| ID | Vehicle / Scenario | Ex-Showroom | RTO Rate | RTO (₹) | Ins (₹) | Cess (₹) | Freight (₹) | Disc (₹) | TCS (₹) | Net Landed (₹) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | MH Petrol (< 10L) | ₹8,50,000 | 11.0% | ₹93,500 | ₹29,750 | ₹2,500 | ₹5,000 | ₹30,000 | ₹0 | **₹9,50,750** |
| **02** | MH Diesel (> 10L) | ₹14,50,000 | 13.0% | ₹1,88,500 | ₹50,000 | ₹2,500 | ₹8,000 | ₹65,000 | ₹14,500 | **₹16,48,500** |
| **03** | MH EV (> 10L, 0% RTO) | ₹15,00,000 | 0.0% | ₹0 | ₹48,000 | ₹2,500 | ₹6,000 | ₹50,000 | ₹15,000 | **₹15,21,500** |
| **04** | MH CNG (< 10L) | ₹7,80,000 | 7.0% | ₹54,600 | ₹28,000 | ₹2,000 | ₹4,000 | ₹25,000 | ₹0 | **₹8,43,600** |
| **05** | MP Petrol (< 10L) | ₹9,20,000 | 9.0% | ₹82,800 | ₹32,000 | ₹3,000 | ₹18,000 | ₹40,000 | ₹0 | **₹10,15,800** |
| **06** | MP Diesel (> 10L) | ₹16,00,000 | 10.0% | ₹1,60,000 | ₹55,000 | ₹3,000 | ₹22,000 | ₹70,000 | ₹16,000 | **₹17,86,000** |
| **07** | KA Petrol (> 10L) | ₹13,50,000 | 14.0% | ₹1,89,000 | ₹46,000 | ₹3,000 | ₹15,000 | ₹55,000 | ₹13,500 | **₹15,61,500** |
| **08** | Stock Clearance | ₹12,00,000 | 11.0% | ₹1,32,000 | ₹40,000 | ₹2,500 | ₹10,000 | ₹1,80,000 | ₹12,000 | **₹12,16,500** |
| **09** | Local Yard Pickup | ₹6,50,000 | 11.0% | ₹71,500 | ₹24,000 | ₹2,000 | ₹0 | ₹20,000 | ₹0 | **₹7,27,500** |
| **10** | Deep Rural Freight | ₹5,99,000 | 11.0% | ₹65,890 | ₹22,000 | ₹2,000 | ₹25,000 | ₹15,000 | ₹0 | **₹6,98,890** |
| **11** | Exact ₹10L Boundary | ₹10,00,000 | 11.0% | ₹1,10,000 | ₹35,000 | ₹2,500 | ₹5,000 | ₹30,000 | ₹0 | **₹11,22,500** |

---

## 9. Compliance & Verification Action Items

- [ ] Connect state motor vehicles department RTO API (Parivahan Vahan 4) for real-time dynamic RTO tax rates before commercial launch `[needs_verification]`.
- [ ] Implement seller TAN validation to generate TCS certificates (Form 27D) automatically at settlement `[needs_verification]`.
- [ ] Enforce automated GSTIN validation on dealer accessories and delivery invoices `[needs_verification]`.
