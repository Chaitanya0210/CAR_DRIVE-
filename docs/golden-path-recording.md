# GroupDrive Golden Path: Real-Account End-to-End Walkthrough

**Audit Date:** October 31, 2026  
**Auditor:** QA Lead & Principal Systems Engineer  
**Coverage:** 2 Buyers, 2 Sellers, 1 Admin across Web, API, Database, and AI services

---

## 1. Walkthrough Summary

The golden path test runs a 9-stage real-account lifecycle:
1. **Buyer 1 Onboarding:** Ramesh Patil enters phone OTP credentials, selects delivery target `MH > PUN > BAR (Baramati, 413102)`.
2. **Buyer 2 Quorum Hit:** Suresh Deshmukh joins the Scorpio-N group, hitting the 5/5 target size (`THRESHOLD_MET`).
3. **Sealed Reverse Auction:** 48-hour bidding window opens (`RFQ_OPEN`).
4. **Dealer Quotes:** Sahyadri Automotive (Pune) bids ₹1,65,000 discount + 7D mats; Shivaji Auto (Satara) bids ₹1,40,000 discount.
5. **Quote Comparison & Voting:** Quotes are unmasked, landed cost normalized (ex-showroom - discount + RTO + insurance + logistics + TCS), and cohort votes for Sahyadri Automotive (`WINNER_SELECTED`).
6. **Booking:** Individual ₹25,000 deposit held pending delivery (`HELD_PENDING_DELIVERY`).
7. **Delivery Milestones:** Carrier Flatbed Dispatched -> In Transit with Telematics -> Arrived at Baramati Hub -> Physical PDI Inspection (odometer: 28 km < 100 km verified) -> Handover OTP confirmed (`DELIVERED`).
8. **Platform Settlement:** 1% commission (₹15,200) + 18% GST (₹2,736) recorded into append-only `LedgerEntry`. Deposit released, group marked `COMPLETED`.
9. **Admin Live Ops & Ledger Export:** Verified in Admin console, exported to RFC 4180 CSV.

Screenshots captured during live execution:
- `golden_path_01_buyer_onboarding.png`
- `golden_path_02_group_quorum.png`
- `golden_path_03_seller_quotes.png`
- `golden_path_04_quote_comparison_voting.png`
- `golden_path_05_booking_and_milestones.png`
- `golden_path_06_admin_settlement_ledger.png`
