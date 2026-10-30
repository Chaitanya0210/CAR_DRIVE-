"""
Official knowledge corpus for GroupDrive: vehicle brochures, spec tables,
platform policies, reverse auction rules, and anonymized rural group deal summaries.
"""

KNOWLEDGE_DOCUMENTS = [
    {
        "doc_id": "doc-scorpio-n",
        "title": "Mahindra Scorpio-N Official Specification Brochure & Rural Guide",
        "brand": "Mahindra",
        "model": "Scorpio-N",
        "variant": "Z2, Z4, Z6, Z8, Z8 Select, Z8 L",
        "source": "brochure",
        "language": "en",
        "content": """# Mahindra Scorpio-N Official Specification & Variant Guide

## Overview & Positioning
The Mahindra Scorpio-N is a D-segment ladder-frame SUV built for rugged Indian terrain, semi-urban road conditions, and large families. It features 5-Star Global NCAP adult safety rating and optional 4XPLOR intelligent terrain management 4x4.

## Variant Comparison Matrix
| Variant | Fuel Options | Transmission | Seating | Key Highlights | Ex-Showroom (Approx) |
|---|---|---|---|---|---|
| Z2 | Petrol / Diesel | 6-Speed MT | 7-Seater | 2.0L Turbo / 2.2L mHawk, Touchscreen, Dual Airbags | ₹13.85 Lakh |
| Z4 | Petrol / Diesel | 6-Speed MT / AT | 7-Seater | Rear AC, Cruise Control, Electronic Stability Control (ESC) | ₹15.45 Lakh |
| Z6 | Diesel | 6-Speed MT / AT | 7-Seater | Sunroof, AdrenoX Connect with Alexa, 8-inch Infotainment | ₹16.85 Lakh |
| Z8 Select | Petrol / Diesel | 6-Speed MT / AT | 7-Seater | Coffee Black Leatherette, Dual-Zone Climate, LED Projectors | ₹17.10 Lakh |
| Z8 | Petrol / Diesel | 6-Speed MT / AT / 4x4 | 7-Seater | 6 Airbags, 4XPLOR 4WD system, Push Button Start, TPMS | ₹18.85 Lakh |
| Z8 L | Petrol / Diesel | 6-Speed MT / AT / 4x4 | 6/7-Seater | 12-Speaker Sony 3D Audio, Front Camera, Wireless Charger, Powered Seat | ₹21.50 Lakh - ₹24.54 Lakh |

## Engine, Performance & Mileage
- **Diesel**: 2.2L mHawk Turbocharged Diesel, 175 PS @ 3500 rpm, 400 Nm torque (AT) / 370 Nm (MT). Real-world highway mileage 14-15 km/l; rural/city mileage 11-12 km/l.
- **Petrol**: 2.0L TGDi mStallion Turbo Petrol, 203 PS @ 5000 rpm, 380 Nm torque. Real-world mileage 9-11 km/l.
- **Ground Clearance**: 187 mm unladen with 500 mm water wading capability, suitable for village approach roads and monsoon flooding.

## Safety & Crash Test Credentials
- 5-Star Global NCAP Adult Safety Rating (34.00/34.00 points).
- 6 Airbags (Front, Side, Curtain) standard from Z8 variant.
- ISOFIX child seat anchors, ABS with EBD, Hill Hold & Hill Descent Control.
"""
    },
    {
        "doc_id": "doc-tata-nexon",
        "title": "Tata Nexon Facelift Specification Sheet & Feature Guide",
        "brand": "Tata Motors",
        "model": "Nexon",
        "variant": "Smart, Pure, Creative, Fearless",
        "source": "brochure",
        "language": "en",
        "content": """# Tata Nexon Official Specification Guide

## Overview
The Tata Nexon is India's leading compact SUV offering premium styling, class-leading 208 mm ground clearance, 5-Star Bharat NCAP & Global NCAP safety, and 6 airbags standard across every single variant.

## Variant & Price Matrix
| Persona / Variant | Engine & Gearbox | Key Features | Price Range (Ex-Showroom) |
|---|---|---|---|
| Smart / Smart Plus | 1.2L Petrol (5-MT) | 6 Airbags standard, LED Headlamps & DRLs, ESP | ₹8.00 - ₹9.20 Lakh |
| Pure / Pure S | 1.2L Petrol / 1.5L Diesel (6-MT/AMT) | Voice-assisted Sunroof, 7-inch Touchscreen, Roof Rails | ₹9.70 - ₹11.20 Lakh |
| Creative / Creative Plus | 1.2L Petrol / 1.5L Diesel (MT/AMT/7-DCA) | 10.25-inch Touchscreen, 360-degree HD Camera, 16-inch Alloys | ₹11.00 - ₹13.20 Lakh |
| Fearless / Fearless Plus S | 1.2L Petrol / 1.5L Diesel (MT/AMT/7-DCA) | Ventilated Front Seats, Slim Bezel Display, JBL Subwoofer | ₹12.50 - ₹15.80 Lakh |

## Powertrain Specifications
- **1.2L Turbocharged Revotron Petrol**: 120 PS power, 170 Nm torque. ARAI certified mileage: 17.44 km/l (MT), 17.18 km/l (DCA).
- **1.5L Revotorq Diesel**: 115 PS power, 260 Nm torque. ARAI certified mileage: 23.23 km/l (MT), 24.08 km/l (AMT). Highly recommended for rural commuting.
- **Boot Space**: 382 Litres, expandable to 690 Litres with 60:40 rear split.
"""
    },
    {
        "doc_id": "doc-maruti-brezza",
        "title": "Maruti Suzuki Brezza & S-CNG Specifications Brochure",
        "brand": "Maruti Suzuki",
        "model": "Brezza",
        "variant": "LXi, VXi, ZXi, ZXi Plus, S-CNG",
        "source": "brochure",
        "language": "en",
        "content": """# Maruti Suzuki Brezza Specification Guide

## Overview
The Maruti Suzuki Brezza is a practical, fuel-efficient compact SUV powered by the 1.5L K-Series DualJet Dual VVT engine with Progressive Smart Hybrid technology and factory-fitted S-CNG options.

## Variant & Feature Matrix
| Variant | Fuel / Powertrain | Key Features | Ex-Showroom Price |
|---|---|---|---|
| LXi | 1.5L Petrol (5-MT) / CNG | Dual Airbags, ESP, Hill Hold, Halogen Projector, Keyless Entry | ₹8.34 Lakh |
| VXi | 1.5L Petrol (5-MT/6-AT) / CNG | 7-inch SmartPlay Touchscreen, Auto AC, Rear AC Vents | ₹9.70 - ₹11.10 Lakh |
| ZXi | 1.5L Petrol (5-MT/6-AT) / CNG | Electric Sunroof, Dual LED Projectors, 16-inch Alloy Wheels | ₹11.15 - ₹12.55 Lakh |
| ZXi Plus | 1.5L Petrol (5-MT/6-AT) | 6 Airbags, 360-degree View Camera, Head-Up Display (HUD) | ₹12.58 - ₹14.14 Lakh |

## Fuel Efficiency & Economy
- **Petrol Manual (Smart Hybrid)**: 19.89 km/l ARAI mileage.
- **Petrol 6-Speed Automatic**: 19.80 km/l ARAI mileage.
- **Brezza S-CNG**: 25.51 km/kg certified fuel economy. Ideal for low running cost in semi-urban areas with growing CNG pump density.
"""
    },
    {
        "doc_id": "doc-platform-policies",
        "title": "GroupDrive Reverse Auction Platform Policies & Buyer Safeguards",
        "brand": "GroupDrive",
        "model": "Platform",
        "variant": "All",
        "source": "policy",
        "language": "en",
        "content": """# GroupDrive Reverse Auction Policies & Platform Safeguards

## 1. Zone Density & Group Formation Thresholds
GroupDrive aggregates buyers locally to give collective bargaining power against dealerships. Minimum group sizes required to trigger the reverse auction:
- **METRO**: Minimum 8 buyers.
- **URBAN**: Minimum 5 buyers.
- **SEMI_URBAN** (e.g. Baramati, Satara, Ujjain): Minimum 4 buyers.
- **RURAL** (e.g. Karad, Hatkanangale, Dewas): Minimum 3 buyers.
- **DEEP_RURAL**: Minimum 2 buyers.

## 2. Reverse Auction & Sealed Bidding Rules
- When a group meets its quorum threshold or deadline expires with valid quorum, a sealed reverse auction (RFQ) opens for verified dealers.
- Bidding window is open for 48 hours.
- Sealed Bids: Dealers cannot see each other's quotes during the bidding window. Quotes are encrypted.
- Landed Cost Normalization: All dealer bids must quote Ex-Showroom, Group Discount, Logistics to Buyer's Zone, Insurance, and RTO taxes. Quotes are normalized by GroupDrive landed-cost engine to ensure exact apple-to-apple comparison.

## 3. Financial Safety & Booking Protection
- **No Buyer Platform Fees**: GroupDrive is 100% free for buyers. No membership fees or hidden handling charges.
- **Booking Amount**: ₹25,000 per member held pending delivery. The amount is never paid directly to dealer upfront; it is held in secure platform escrow pending physical vehicle handover and inspection.
- **100% Refund Guarantee**: If the winning dealer withdraws, delays delivery past 30 days of committed SLA, or delivers a damaged vehicle, the buyer receives an immediate 100% full refund with zero cancellation deductions.
- **Seller Charges**: Sellers pay a one-time onboarding fee of ₹19,999 + GST upon legal KYB approval, plus a 1% commission on delivered vehicle value.
"""
    },
    {
        "doc_id": "doc-delivery-logistics",
        "title": "Rural Delivery, RTO Taxes & Document Checklist",
        "brand": "GroupDrive",
        "model": "Logistics",
        "variant": "Maharashtra & Madhya Pradesh",
        "source": "faq",
        "language": "en",
        "content": """# Rural Delivery, RTO Taxes & Documentation Guide

## Doorstep Delivery vs Hub Handover
- **Doorstep Flatbed Delivery**: For rural talukas and villages, dealers can arrange certified flatbed transit directly to the buyer's farm or residence. Transit insurance covers 100% of transit risks until physical handover.
- **Hub Handover**: Buyers can also choose delivery at the district authorized dealership hub, which saves logistics transit fees (typically ₹8,000 - ₹15,000).

## On-Road Landed Cost Components
1. **Ex-Showroom Price**: Manufacturer price quoted by dealer.
2. **Group Discount**: Bulk discount granted to the group (typically 6% to 15% off ex-showroom).
3. **State Road Tax (RTO)**:
   - Maharashtra: 11% - 13% for petrol; 13% - 15% for diesel vehicles. Individual registration.
   - Madhya Pradesh: 8% - 12% depending on vehicle cost slab.
4. **TCS (Tax Collected at Source)**: 1% mandatory under section 206C(1F) for vehicles with ex-showroom exceeding ₹10,00,000.
5. **Logistics & Transit Fee**: Subsidized freight to destination zone.

## Mandatory Vehicle Handover Checklist
Before signing delivery confirmation:
1. Form 20 (Application for Registration) & Form 21 (Sale Certificate).
2. OEM Warranty Card & 24x7 Roadside Assistance handbook.
3. Pollution Under Control (PUC) certificate & High Security Registration Plate (HSRP).
4. Physical PDI (Pre-Delivery Inspection): Check odometer reading (under 100 km for new cars), verify VIN on engine bay and chassis plate.
"""
    },
    {
        "doc_id": "doc-anonymized-deals",
        "title": "Past Verified Group Deals & Rural Savings Benchmark",
        "brand": "GroupDrive",
        "model": "Group History",
        "variant": "Real Deals",
        "source": "deal_summary",
        "language": "en",
        "content": """# Past Verified Group Deals & Benchmark Savings

## Deal #GD-MAH-2026-01: Baramati Mahindra Scorpio-N Cohort
- **Zone**: Baramati Taluka, Pune District, Maharashtra (Semi-Urban).
- **Group Size**: 5 Farmers & Agri-Business Owners.
- **Car**: Mahindra Scorpio-N Z8 Select Diesel MT.
- **MRP Ex-Showroom**: ₹17,10,000 per vehicle.
- **Winning Reverse Auction Bid**: ₹15,45,000 per vehicle.
- **Net Group Savings**: ₹1,65,000 per car (Total cohort savings ₹8,25,000) + Free 3-Year Extended Warranty + OEM Floor Mats.
- **Delivery**: Flatbed transit to Baramati hub in 18 days.

## Deal #GD-SAT-2026-04: Satara Maruti Brezza Group
- **Zone**: Karad Taluka, Satara District, Maharashtra (Rural).
- **Group Size**: 4 Local Teachers & Small Business Owners.
- **Car**: Maruti Suzuki Brezza ZXi Petrol MT.
- **MRP Ex-Showroom**: ₹11,15,000.
- **Winning Reverse Bid**: ₹10,37,000.
- **Net Group Savings**: ₹78,000 per car + ₹15,000 accessory pack free.
- **Delivery**: Showroom handover at Karad hub.

## Deal #GD-KOL-2026-09: Kolhapur Tata Nexon Cluster
- **Zone**: Hatkanangale, Kolhapur District, Maharashtra (Rural).
- **Group Size**: 3 Cooperative Members.
- **Car**: Tata Nexon Creative Plus 1.5 Diesel MT.
- **MRP Ex-Showroom**: ₹12,50,000.
- **Winning Bid**: ₹11,58,000.
- **Net Group Savings**: ₹92,000 per car.
"""
    },
    {
        "doc_id": "doc-hinglish-multilingual-faq",
        "title": "Multilingual Rural Car Advisor FAQ (Hinglish, Hindi, Marathi)",
        "brand": "GroupDrive",
        "model": "All",
        "variant": "Hinglish, Hindi, Marathi",
        "source": "faq",
        "language": "hinglish",
        "content": """# Multilingual Rural Car Advisor FAQ

## Hinglish Questions & Answers
- **Question**: Bhai 12 lakh ke budget me diesel SUV Baramati delivery ke liye kaunsi best rahegi?
  **Answer**: 12 lakh ke budget me Tata Nexon Pure Diesel MT ya Creative Diesel MT best option hai. Isme 1.5L Revotorq diesel engine (115 PS, 260 Nm) milta hai jo 23+ km/l ka mileage deta hai aur 208 mm ground clearance kharab gramin sadko ke liye perfect hai. Sath me 5-Star Bharat NCAP safety aur 6 standard airbags aate hain. GroupDrive pe 3-4 buyers ka group banake ₹70,000 se ₹90,000 tak reverse auction discount mil sakta hai.
  [Source: Tata Nexon Official Specification Sheet & Feature Guide, Section: Powertrain Specifications]

- **Question**: GroupDrive me reverse auction kaise kaam karta hai aur hamare paise safe hain kya?
  **Answer**: GroupDrive me jab aapke taluka me minimum buyers (Semi-Urban me 4, Rural me 3) group join karte hain, tab 48 hours ke liye sealed reverse auction khulta hai jisme authorized verified dealers best discounted quote dete hain. Aapka ₹25,000 booking amount delivery hone tak safe escrow me rehta hai. Agar dealer default kare ya delivery me deri kare toh 100% full refund guarantee milti hai zero cancellation charges ke sath.
  [Source: GroupDrive Reverse Auction Platform Policies & Buyer Safeguards, Section: Reverse Auction & Sealed Bidding Rules]

## Marathi Questions & Answers
- **Question**: बारामती किंवा सातारा ग्रामीण भागासाठी सर्वात जास्त मायलेज देणारी गाडी कोणती आहे?
  **Answer**: ग्रामीण भागासाठी मारुती सुझुकी ब्रेझा (Brezza) S-CNG किंवा टाटा नेक्सॉन डिझेल (Nexon Diesel) सर्वोत्तम आहेत. ब्रेझा सीएनजी 25.51 km/kg मायलेज देते आणि नेक्सॉन डिझेल 23.23 km/l मायलेज देते. 208 mm ग्राउंड क्लिअरन्समुळे शेतातील रस्त्यांवर गाडी खाली लागत नाही.
  [Source: Maruti Suzuki Brezza & S-CNG Specifications Brochure, Section: Fuel Efficiency & Economy]

- **Question**: ग्रुपड्राइव्हवर ग्रुप कसा तयार करायचा?
  **Answer**: ग्रुपड्राइव्हवर तुम्ही तुमच्या पसंतीची गाडी निवडून तुमच्या तालुक्यासाठी ग्रुप सुरू करू शकता. ग्रामीण भागात फक्त 3 खरेदीदार एकत्र आले की रिव्हर्स ऑक्शन सुरू होते आणि अधिकृत डीलर्सकडून थेट घाऊक सवलत मिळते.
  [Source: GroupDrive Reverse Auction Platform Policies & Buyer Safeguards, Section: Zone Density & Group Formation Thresholds]
"""
    }
]
