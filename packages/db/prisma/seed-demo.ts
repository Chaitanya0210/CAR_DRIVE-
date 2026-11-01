/**
 * GroupDrive Master Demo Dataset Seed Script (pnpm seed:demo)
 *
 * Seeds:
 * 1. 3 States (Maharashtra, Madhya Pradesh, Karnataka) with 15 districts, talukas & pincodes (heavily rural).
 * 2. Regulatory State Tax Configs for all 3 states.
 * 3. 8 Brands, 30 Models, 100 Variants with plausible prices, specs, and city prices.
 * 4. 15 Dealerships across states with branches, brand authorizations, and trust scores.
 * 5. 100 Rural and semi-urban Buyers with full KYC profiles.
 * 6. 25 Groups spanning the entire lifecycle:
 *    - 6 FORMING (open)
 *    - 5 QUORUM_REACHED (near threshold)
 *    - 4 RFQ_ACTIVE (sealed bidding open)
 *    - 4 VOTING_OPEN (bids unsealed & normalized, members voting)
 *    - 3 DEAL_LOCKED / BOOKED (winning quote chosen, booking tokens held)
 *    - 3 FULFILLED / COMPLETED (doorstep delivered, commission settled, reviewed)
 * 7. 40 Offered Vehicles across CLEARANCE, DEMO, and PREVIOUS_YEAR categories.
 * 8. Complete shipments, 1% commission settlements, double-entry ledger entries, and buyer reviews.
 */

import {
  PrismaClient,
  UserRole,
  SellerKycStatus,
  SellerRegistrationFeeStatus,
  KycDocumentType,
  KycVerificationStatus,
  PaymentStatus,
  PaymentGatewayProvider,
  PaymentType,
  ZoneLevel,
  ZoneDensityClass,
  VehicleFuelType,
  VehicleTransmission,
  VehicleBodyType,
  VehicleConditionType,
  GroupStatus,
  MembershipStatus,
  RfqStatus,
  QuoteStatus,
  QuoteLineItemCategory,
  BookingStatus,
  SettlementStatus,
  DeliveryStatus,
  LedgerAccountType,
} from '@prisma/client';
import { applyDatabaseTriggers } from '../scripts/apply-triggers';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Comprehensive GroupDrive Demo Seed (seed:demo)...');

  // Prepare clean state for demo groups, bookings, settlements & ledger
  await prisma.$executeRawUnsafe(
    'DROP TRIGGER IF EXISTS trg_ledger_entry_append_only ON "LedgerEntry";',
  );
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Review", "Settlement", "ShipmentMilestone", "DeliveryShipment", "Payment", "Booking", "Vote", "QuoteLineItem", "Quote", "RFQEligibility", "RFQ", "GroupPreference", "Membership", "Group", "LedgerEntry" CASCADE;',
  );
  await prisma.$executeRawUnsafe(
    'ALTER SEQUENCE IF EXISTS "LedgerEntry_entryNumber_seq" RESTART WITH 1;',
  );

  // Apply append-only DB triggers
  await applyDatabaseTriggers(prisma);

  // ============================================================================
  // 1. ADMINISTRATIVE ZONE HIERARCHY (3 States, 15 Districts, Talukas & Pincodes)
  // ============================================================================
  console.log('📍 [1/8] Seeding 3 States, 15 Districts, Talukas & Rural Pincodes...');

  async function upsertZone(
    name: string,
    code: string,
    level: ZoneLevel,
    densityClass: ZoneDensityClass,
    parentId?: string,
    pincode?: string,
    lat?: number,
    lng?: number,
    metadata?: Record<string, unknown>,
  ) {
    const existing = await prisma.zone.findFirst({
      where: parentId ? { parentId, code } : { code, level },
    });
    if (existing) {
      return prisma.zone.update({
        where: { id: existing.id },
        data: {
          name,
          densityClass,
          pincode,
          latitude: lat,
          longitude: lng,
          metadata: metadata as any,
        },
      });
    }
    return prisma.zone.create({
      data: {
        name,
        code,
        level,
        densityClass,
        parentId,
        pincode,
        latitude: lat,
        longitude: lng,
        metadata: metadata as any,
      },
    });
  }

  // 1.1 States
  const mh = await upsertZone(
    'Maharashtra',
    'MH',
    ZoneLevel.STATE,
    ZoneDensityClass.URBAN,
    undefined,
    undefined,
    19.7515,
    75.7139,
    { gstStateCode: 27 },
  );
  const mp = await upsertZone(
    'Madhya Pradesh',
    'MP',
    ZoneLevel.STATE,
    ZoneDensityClass.URBAN,
    undefined,
    undefined,
    22.9734,
    78.6569,
    { gstStateCode: 23 },
  );
  const ka = await upsertZone(
    'Karnataka',
    'KA',
    ZoneLevel.STATE,
    ZoneDensityClass.URBAN,
    undefined,
    undefined,
    15.3173,
    75.7139,
    { gstStateCode: 29 },
  );

  // 1.2 Districts & Talukas (MH: 6 districts)
  const puneDist = await upsertZone(
    'Pune',
    'PUN',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.URBAN,
    mh.id,
    undefined,
    18.5204,
    73.8567,
  );
  const baramatiTal = await upsertZone(
    'Baramati',
    'TAL-BARAMATI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    puneDist.id,
    undefined,
    18.1519,
    74.577,
  );
  const baramatiPin = await upsertZone(
    'Baramati Town',
    'PIN-413102',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    baramatiTal.id,
    '413102',
    18.1519,
    74.577,
  );
  const malegaonPin = await upsertZone(
    'Malegaon Budruk',
    'PIN-413115',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    baramatiTal.id,
    '413115',
    18.1254,
    74.5312,
  );
  const junnarTal = await upsertZone(
    'Junnar',
    'TAL-JUNNAR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    puneDist.id,
    undefined,
    19.2064,
    73.8763,
  );
  const alephataPin = await upsertZone(
    'Alephata',
    'PIN-410502',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    junnarTal.id,
    '410502',
    19.2064,
    73.8763,
  );
  const shirurTal = await upsertZone(
    'Shirur',
    'TAL-SHIRUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    puneDist.id,
    undefined,
    18.8267,
    74.3789,
  );
  const haveliTal = await upsertZone(
    'Haveli',
    'TAL-HAVELI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.SEMI_URBAN,
    puneDist.id,
    undefined,
    18.4967,
    73.9312,
  );

  const sataraDist = await upsertZone(
    'Satara',
    'SAT',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.RURAL,
    mh.id,
    undefined,
    17.6805,
    74.0183,
  );
  const karadTal = await upsertZone(
    'Karad',
    'TAL-KARAD',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    sataraDist.id,
    undefined,
    17.2882,
    74.1837,
  );
  const karadPin = await upsertZone(
    'Karad Rural',
    'PIN-415110',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    karadTal.id,
    '415110',
    17.2882,
    74.1837,
  );
  const phaltanTal = await upsertZone(
    'Phaltan',
    'TAL-PHALTAN',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    sataraDist.id,
    undefined,
    17.9866,
    74.4312,
  );
  const phaltanPin = await upsertZone(
    'Phaltan Rural',
    'PIN-415523',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    phaltanTal.id,
    '415523',
    17.9866,
    74.4312,
  );

  const ahmednagarDist = await upsertZone(
    'Ahmednagar',
    'AHM',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.RURAL,
    mh.id,
    undefined,
    19.0948,
    74.748,
  );
  const sangamnerTal = await upsertZone(
    'Sangamner',
    'TAL-SANGAMNER',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    ahmednagarDist.id,
    undefined,
    19.5772,
    74.2094,
  );
  const shrirampurTal = await upsertZone(
    'Shrirampur',
    'TAL-SHRIRAMPUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    ahmednagarDist.id,
    undefined,
    19.6192,
    74.6575,
  );

  const kolhapurDist = await upsertZone(
    'Kolhapur',
    'KOL',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    mh.id,
    undefined,
    16.705,
    74.2433,
  );
  const hatkanangaleTal = await upsertZone(
    'Hatkanangale',
    'TAL-HATKANANGALE',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    kolhapurDist.id,
    undefined,
    16.7454,
    74.4447,
  );
  const shirolTal = await upsertZone(
    'Shirol',
    'TAL-SHIROL',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    kolhapurDist.id,
    undefined,
    16.7328,
    74.5983,
  );

  const solapurDist = await upsertZone(
    'Solapur',
    'SOL',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    mh.id,
    undefined,
    17.6599,
    75.9064,
  );
  const pandharpurTal = await upsertZone(
    'Pandharpur',
    'TAL-PANDHARPUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    solapurDist.id,
    undefined,
    17.6778,
    75.3283,
  );
  const barshiTal = await upsertZone(
    'Barshi',
    'TAL-BARSHI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    solapurDist.id,
    undefined,
    18.2333,
    75.6833,
  );

  const nashikDist = await upsertZone(
    'Nashik',
    'NAS',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    mh.id,
    undefined,
    19.9975,
    73.7898,
  );
  const dindoriTal = await upsertZone(
    'Dindori',
    'TAL-DINDORI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    nashikDist.id,
    undefined,
    20.2012,
    73.8344,
  );
  const niphadTal = await upsertZone(
    'Niphad',
    'TAL-NIPHAD',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    nashikDist.id,
    undefined,
    20.0754,
    74.1083,
  );

  // MP: 5 districts
  const indoreDist = await upsertZone(
    'Indore',
    'IND',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.URBAN,
    mp.id,
    undefined,
    22.7196,
    75.8577,
  );
  const depalpurTal = await upsertZone(
    'Depalpur',
    'TAL-DEPALPUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    indoreDist.id,
    undefined,
    22.8532,
    75.5492,
  );
  const depalpurPin = await upsertZone(
    'Depalpur Town',
    'PIN-453115',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.RURAL,
    depalpurTal.id,
    '453115',
    22.8532,
    75.5492,
  );
  const sanwerTal = await upsertZone(
    'Sanwer',
    'TAL-SANWER',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    indoreDist.id,
    undefined,
    22.9774,
    75.8285,
  );

  const dharDist = await upsertZone(
    'Dhar',
    'DHA',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.RURAL,
    mp.id,
    undefined,
    22.5978,
    75.2974,
  );
  const badnawarTal = await upsertZone(
    'Badnawar',
    'TAL-BADNAWAR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dharDist.id,
    undefined,
    23.0183,
    75.2289,
  );
  const kukshiTal = await upsertZone(
    'Kukshi',
    'TAL-KUKSHI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dharDist.id,
    undefined,
    22.2039,
    74.7571,
  );

  const ujjainDist = await upsertZone(
    'Ujjain',
    'UJJ',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    mp.id,
    undefined,
    23.1765,
    75.7885,
  );
  const mahidpurTal = await upsertZone(
    'Mahidpur',
    'TAL-MAHIDPUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    ujjainDist.id,
    undefined,
    23.4862,
    75.6575,
  );
  const nagdaTal = await upsertZone(
    'Nagda',
    'TAL-NAGDA',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    ujjainDist.id,
    undefined,
    23.4542,
    75.4125,
  );

  const dewasDist = await upsertZone(
    'Dewas',
    'DEW',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    mp.id,
    undefined,
    22.9676,
    76.0534,
  );
  const sonkatchTal = await upsertZone(
    'Sonkatch',
    'TAL-SONKATCH',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dewasDist.id,
    undefined,
    22.9734,
    76.3812,
  );
  const bagliTal = await upsertZone(
    'Bagli',
    'TAL-BAGLI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dewasDist.id,
    undefined,
    22.6454,
    76.3533,
  );

  const khargoneDist = await upsertZone(
    'Khargone',
    'KHA',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.RURAL,
    mp.id,
    undefined,
    21.8236,
    75.6171,
  );
  const barwahTal = await upsertZone(
    'Barwah',
    'TAL-BARWAH',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    khargoneDist.id,
    undefined,
    22.2533,
    76.0412,
  );
  const kasrawadTal = await upsertZone(
    'Kasrawad',
    'TAL-KASRAWAD',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    khargoneDist.id,
    undefined,
    22.1312,
    75.6033,
  );

  // KA: 4 districts (Agrarian & Sugar belt)
  const belagaviDist = await upsertZone(
    'Belagavi',
    'BEL',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    ka.id,
    undefined,
    15.8497,
    74.4977,
  );
  const chikkodiTal = await upsertZone(
    'Chikkodi',
    'TAL-CHIKKODI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.DEEP_RURAL,
    belagaviDist.id,
    undefined,
    16.4312,
    74.5983,
  );
  const chikkodiPin = await upsertZone(
    'Chikkodi Town',
    'PIN-591201',
    ZoneLevel.VILLAGE_PINCODE,
    ZoneDensityClass.DEEP_RURAL,
    chikkodiTal.id,
    '591201',
    16.4312,
    74.5983,
  );
  const athaniTal = await upsertZone(
    'Athani',
    'TAL-ATHANI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.DEEP_RURAL,
    belagaviDist.id,
    undefined,
    16.7328,
    75.0594,
  );
  const gokakTal = await upsertZone(
    'Gokak',
    'TAL-GOKAK',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    belagaviDist.id,
    undefined,
    16.1683,
    74.8233,
  );

  const dharwadDist = await upsertZone(
    'Dharwad',
    'DHW',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    ka.id,
    undefined,
    15.4589,
    75.0078,
  );
  const navalgundTal = await upsertZone(
    'Navalgund',
    'TAL-NAVALGUND',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dharwadDist.id,
    undefined,
    15.5683,
    75.3612,
  );
  const kalghatgiTal = await upsertZone(
    'Kalghatgi',
    'TAL-KALGHATGI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    dharwadDist.id,
    undefined,
    15.1812,
    74.9783,
  );

  const mysuruDist = await upsertZone(
    'Mysuru',
    'MYS',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.SEMI_URBAN,
    ka.id,
    undefined,
    12.2958,
    76.6394,
  );
  const hunsurTal = await upsertZone(
    'Hunsur',
    'TAL-HUNSUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    mysuruDist.id,
    undefined,
    12.3083,
    76.2912,
  );
  const nanjangudTal = await upsertZone(
    'Nanjangud',
    'TAL-NANJANGUD',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    mysuruDist.id,
    undefined,
    12.1183,
    76.6812,
  );

  const mandyaDist = await upsertZone(
    'Mandya',
    'MAN',
    ZoneLevel.DISTRICT,
    ZoneDensityClass.RURAL,
    ka.id,
    undefined,
    12.5218,
    76.8951,
  );
  const maddurTal = await upsertZone(
    'Maddur',
    'TAL-MADDUR',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    mandyaDist.id,
    undefined,
    12.5842,
    77.0425,
  );
  const malavalliTal = await upsertZone(
    'Malavalli',
    'TAL-MALAVALLI',
    ZoneLevel.TALUKA,
    ZoneDensityClass.RURAL,
    mandyaDist.id,
    undefined,
    12.3862,
    77.0547,
  );

  const allTalukas = [
    baramatiTal,
    junnarTal,
    shirurTal,
    haveliTal,
    karadTal,
    phaltanTal,
    sangamnerTal,
    shrirampurTal,
    hatkanangaleTal,
    shirolTal,
    pandharpurTal,
    barshiTal,
    dindoriTal,
    niphadTal,
    depalpurTal,
    sanwerTal,
    badnawarTal,
    kukshiTal,
    mahidpurTal,
    nagdaTal,
    sonkatchTal,
    bagliTal,
    barwahTal,
    kasrawadTal,
    chikkodiTal,
    athaniTal,
    gokakTal,
    navalgundTal,
    kalghatgiTal,
    hunsurTal,
    nanjangudTal,
    maddurTal,
    malavalliTal,
  ];

  // ============================================================================
  // 2. REGULATORY STATE TAX CONFIGS (Road Tax & Cess for MH, MP, KA)
  // ============================================================================
  console.log('⚖️ [2/8] Seeding Regulatory State Tax Configs for MH, MP & KA...');

  const taxRules = [
    // Maharashtra (11-14% Petrol/Diesel, 7% CNG, 0% EV)
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 11.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 12.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 13.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 14.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.CNG,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 7.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.ELECTRIC,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(500000000),
      taxPercent: 0.0,
    },
    {
      zoneId: mh.id,
      fuelType: VehicleFuelType.HYBRID,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 9.0,
    },
    // Madhya Pradesh (8-10% Petrol/Diesel, 6% CNG, 2% EV)
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 8.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 10.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 10.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 12.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.CNG,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 6.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.ELECTRIC,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(500000000),
      taxPercent: 2.0,
    },
    {
      zoneId: mp.id,
      fuelType: VehicleFuelType.HYBRID,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 7.0,
    },
    // Karnataka (13-17% Petrol/Diesel, 9% CNG, 4% EV)
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 13.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.PETROL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 14.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(100000000),
      taxPercent: 14.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.DIESEL,
      minPricePaise: BigInt(100000001),
      maxPricePaise: BigInt(200000000),
      taxPercent: 16.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.CNG,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 9.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.ELECTRIC,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(500000000),
      taxPercent: 4.0,
    },
    {
      zoneId: ka.id,
      fuelType: VehicleFuelType.HYBRID,
      minPricePaise: BigInt(0),
      maxPricePaise: BigInt(200000000),
      taxPercent: 11.0,
    },
  ];

  for (const tr of taxRules) {
    await prisma.stateTaxConfig.upsert({
      where: {
        zoneId_fuelType_minPricePaise_maxPricePaise: {
          zoneId: tr.zoneId,
          fuelType: tr.fuelType,
          minPricePaise: tr.minPricePaise,
          maxPricePaise: tr.maxPricePaise,
        },
      },
      create: {
        ...tr,
        flatFeePaise: BigInt(200000), // ₹2,000 RTO cess / smartcard fee
        needsVerification: true,
      },
      update: {},
    });
  }

  // ============================================================================
  // 3. AUTOMOTIVE CATALOG (8 Brands, 30 Models, 100 Variants)
  // ============================================================================
  console.log('🚗 [3/8] Seeding Automotive Catalog (8 Brands, 30 Models, 100 Variants)...');

  const brands = [
    {
      name: 'Tata Motors',
      slug: 'tata-motors',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Mahindra & Mahindra',
      slug: 'mahindra',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Maruti Suzuki',
      slug: 'maruti-suzuki',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Hyundai',
      slug: 'hyundai',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Kia',
      slug: 'kia',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Toyota',
      slug: 'toyota',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'Honda',
      slug: 'honda',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
    {
      name: 'MG Motor',
      slug: 'mg-motor',
      logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120',
    },
  ];

  const brandEntityMap = new Map<string, any>();
  for (const b of brands) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: b,
      update: {},
    });
    brandEntityMap.set(b.slug, brand);
  }

  // Define 30 Models across 8 Brands
  interface ModelSpec {
    brandSlug: string;
    name: string;
    slug: string;
    bodyType: VehicleBodyType;
    variants: Array<{
      name: string;
      fuelType: VehicleFuelType;
      transmission: VehicleTransmission;
      engineCc?: number;
      batteryKwh?: number;
      seating: number;
      priceInLakhs: number;
    }>;
  }

  const catalogSpecs: ModelSpec[] = [
    // TATA (5 models, 19 variants)
    {
      brandSlug: 'tata-motors',
      name: 'Nexon',
      slug: 'tata-nexon',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'Smart Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 8.15,
        },
        {
          name: 'Pure Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 9.8,
        },
        {
          name: 'Creative Plus Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 11.7,
        },
        {
          name: 'Fearless Plus Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 14.5,
        },
      ],
    },
    {
      brandSlug: 'tata-motors',
      name: 'Punch',
      slug: 'tata-punch',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'Pure Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 6.13,
        },
        {
          name: 'Adventure Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 7.0,
        },
        {
          name: 'Accomplished Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 7.85,
        },
        {
          name: 'Creative iCNG MT',
          fuelType: VehicleFuelType.CNG,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 9.3,
        },
      ],
    },
    {
      brandSlug: 'tata-motors',
      name: 'Harrier',
      slug: 'tata-harrier',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'Smart Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 15.49,
        },
        {
          name: 'Pure Plus Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 18.69,
        },
        {
          name: 'Adventure Plus Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 22.89,
        },
        {
          name: 'Fearless Plus Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 26.44,
        },
      ],
    },
    {
      brandSlug: 'tata-motors',
      name: 'Safari',
      slug: 'tata-safari',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'Pure Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1956,
          seating: 7,
          priceInLakhs: 16.19,
        },
        {
          name: 'Adventure Diesel AT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1956,
          seating: 7,
          priceInLakhs: 23.49,
        },
        {
          name: 'Accomplished Plus Diesel AT 6S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1956,
          seating: 6,
          priceInLakhs: 27.34,
        },
      ],
    },
    {
      brandSlug: 'tata-motors',
      name: 'Tiago',
      slug: 'tata-tiago',
      bodyType: VehicleBodyType.HATCHBACK,
      variants: [
        {
          name: 'XE Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 5.65,
        },
        {
          name: 'XT Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 6.4,
        },
        {
          name: 'XZ Plus Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 7.3,
        },
        {
          name: 'XZ Plus iCNG MT',
          fuelType: VehicleFuelType.CNG,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1199,
          seating: 5,
          priceInLakhs: 8.2,
        },
      ],
    },

    // MAHINDRA (5 models, 17 variants)
    {
      brandSlug: 'mahindra',
      name: 'Scorpio-N',
      slug: 'mahindra-scorpio-n',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'Z2 Petrol MT 7S',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1997,
          seating: 7,
          priceInLakhs: 13.6,
        },
        {
          name: 'Z4 Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2184,
          seating: 7,
          priceInLakhs: 15.24,
        },
        {
          name: 'Z8 Select Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2184,
          seating: 7,
          priceInLakhs: 18.49,
        },
        {
          name: 'Z8 Luxury Diesel 4WD AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 2184,
          seating: 7,
          priceInLakhs: 24.54,
        },
      ],
    },
    {
      brandSlug: 'mahindra',
      name: 'XUV700',
      slug: 'mahindra-xuv700',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'MX Petrol MT 5S',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1997,
          seating: 5,
          priceInLakhs: 13.99,
        },
        {
          name: 'AX5 Petrol MT 7S',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1997,
          seating: 7,
          priceInLakhs: 17.69,
        },
        {
          name: 'AX7 Diesel AT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 2184,
          seating: 7,
          priceInLakhs: 22.99,
        },
        {
          name: 'AX7 Luxury Diesel AWD AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 2184,
          seating: 7,
          priceInLakhs: 26.99,
        },
      ],
    },
    {
      brandSlug: 'mahindra',
      name: 'Thar',
      slug: 'mahindra-thar',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'AX Opt Diesel MT 4WD',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2184,
          seating: 4,
          priceInLakhs: 14.85,
        },
        {
          name: 'LX Petrol AT 4WD',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1997,
          seating: 4,
          priceInLakhs: 16.6,
        },
        {
          name: 'Earth Edition Diesel MT 4WD',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2184,
          seating: 4,
          priceInLakhs: 16.15,
        },
      ],
    },
    {
      brandSlug: 'mahindra',
      name: 'Bolero Neo',
      slug: 'mahindra-bolero-neo',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'N4 Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 7,
          priceInLakhs: 9.9,
        },
        {
          name: 'N8 Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 7,
          priceInLakhs: 10.65,
        },
        {
          name: 'N10 Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 7,
          priceInLakhs: 11.6,
        },
      ],
    },
    {
      brandSlug: 'mahindra',
      name: 'XUV 3XO',
      slug: 'mahindra-xuv-3xo',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'MX1 Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 7.49,
        },
        {
          name: 'AX5 Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 10.69,
        },
        {
          name: 'AX7 Luxury Petrol AT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 13.99,
        },
      ],
    },

    // MARUTI SUZUKI (5 models, 18 variants)
    {
      brandSlug: 'maruti-suzuki',
      name: 'Brezza',
      slug: 'maruti-brezza',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'LXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 8.34,
        },
        {
          name: 'VXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 9.7,
        },
        {
          name: 'ZXi Smart Hybrid AT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 12.54,
        },
        {
          name: 'ZXi Plus Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 12.58,
        },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      name: 'Grand Vitara',
      slug: 'maruti-grand-vitara',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'Sigma Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 10.99,
        },
        {
          name: 'Delta Smart Hybrid MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 12.2,
        },
        {
          name: 'Alpha AllGrip AWD MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 17.01,
        },
        {
          name: 'Alpha Plus Strong Hybrid e-CVT',
          fuelType: VehicleFuelType.HYBRID,
          transmission: VehicleTransmission.CVT,
          engineCc: 1490,
          seating: 5,
          priceInLakhs: 20.09,
        },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      name: 'Fronx',
      slug: 'maruti-fronx',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'Sigma Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 7.52,
        },
        {
          name: 'Delta Plus Turbo MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 998,
          seating: 5,
          priceInLakhs: 9.73,
        },
        {
          name: 'Alpha Turbo AT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 998,
          seating: 5,
          priceInLakhs: 13.04,
        },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      name: 'Swift',
      slug: 'maruti-swift',
      bodyType: VehicleBodyType.HATCHBACK,
      variants: [
        {
          name: 'LXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 6.49,
        },
        {
          name: 'VXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 7.3,
        },
        {
          name: 'ZXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 8.3,
        },
        {
          name: 'ZXi Plus AMT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AMT,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 9.6,
        },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      name: 'Ertiga',
      slug: 'maruti-ertiga',
      bodyType: VehicleBodyType.MUV,
      variants: [
        {
          name: 'LXi Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 7,
          priceInLakhs: 8.69,
        },
        {
          name: 'VXi CNG MT',
          fuelType: VehicleFuelType.CNG,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 7,
          priceInLakhs: 10.78,
        },
        {
          name: 'ZXi Petrol AT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1462,
          seating: 7,
          priceInLakhs: 12.33,
        },
      ],
    },

    // HYUNDAI (4 models, 14 variants)
    {
      brandSlug: 'hyundai',
      name: 'Creta',
      slug: 'hyundai-creta',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'E Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 11.0,
        },
        {
          name: 'EX Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 12.21,
        },
        {
          name: 'SX Tech Petrol IVT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.CVT,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 17.48,
        },
        {
          name: 'SX(O) Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1493,
          seating: 5,
          priceInLakhs: 20.15,
        },
      ],
    },
    {
      brandSlug: 'hyundai',
      name: 'Venue',
      slug: 'hyundai-venue',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'E Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 7.94,
        },
        {
          name: 'S(O) Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 9.89,
        },
        {
          name: 'SX Turbo Petrol DCT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.DCT,
          engineCc: 998,
          seating: 5,
          priceInLakhs: 13.48,
        },
      ],
    },
    {
      brandSlug: 'hyundai',
      name: 'Exter',
      slug: 'hyundai-exter',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'EX Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 6.13,
        },
        {
          name: 'S Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 7.5,
        },
        {
          name: 'SX Petrol AMT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AMT,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 8.87,
        },
        {
          name: 'SX CNG MT',
          fuelType: VehicleFuelType.CNG,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 9.16,
        },
      ],
    },
    {
      brandSlug: 'hyundai',
      name: 'Verna',
      slug: 'hyundai-verna',
      bodyType: VehicleBodyType.SEDAN,
      variants: [
        {
          name: 'EX Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 11.0,
        },
        {
          name: 'SX Turbo Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1482,
          seating: 5,
          priceInLakhs: 14.87,
        },
        {
          name: 'SX(O) Turbo DCT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.DCT,
          engineCc: 1482,
          seating: 5,
          priceInLakhs: 17.42,
        },
      ],
    },

    // KIA (3 models, 9 variants)
    {
      brandSlug: 'kia',
      name: 'Seltos',
      slug: 'kia-seltos',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'HTE Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 5,
          priceInLakhs: 12.39,
        },
        {
          name: 'HTX Petrol IVT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.CVT,
          engineCc: 1497,
          seating: 5,
          priceInLakhs: 16.79,
        },
        {
          name: 'GTX Plus Turbo DCT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.DCT,
          engineCc: 1482,
          seating: 5,
          priceInLakhs: 20.35,
        },
      ],
    },
    {
      brandSlug: 'kia',
      name: 'Sonet',
      slug: 'kia-sonet',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        {
          name: 'HTE Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 5,
          priceInLakhs: 9.8,
        },
        {
          name: 'HTK Plus Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1197,
          seating: 5,
          priceInLakhs: 10.0,
        },
        {
          name: 'GTX Plus Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1493,
          seating: 5,
          priceInLakhs: 15.75,
        },
      ],
    },
    {
      brandSlug: 'kia',
      name: 'Carens',
      slug: 'kia-carens',
      bodyType: VehicleBodyType.MUV,
      variants: [
        {
          name: 'Premium Petrol MT 7S',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1497,
          seating: 7,
          priceInLakhs: 10.52,
        },
        {
          name: 'Prestige Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1493,
          seating: 7,
          priceInLakhs: 13.95,
        },
        {
          name: 'Luxury Plus Turbo DCT 6S',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.DCT,
          engineCc: 1482,
          seating: 6,
          priceInLakhs: 19.67,
        },
      ],
    },

    // TOYOTA (3 models, 9 variants)
    {
      brandSlug: 'toyota',
      name: 'Urban Cruiser Hyryder',
      slug: 'toyota-hyryder',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'E NeoDrive MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 11.14,
        },
        {
          name: 'S NeoDrive AT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 1462,
          seating: 5,
          priceInLakhs: 14.01,
        },
        {
          name: 'G Strong Hybrid e-CVT',
          fuelType: VehicleFuelType.HYBRID,
          transmission: VehicleTransmission.CVT,
          engineCc: 1490,
          seating: 5,
          priceInLakhs: 18.69,
        },
      ],
    },
    {
      brandSlug: 'toyota',
      name: 'Innova Crysta',
      slug: 'toyota-innova-crysta',
      bodyType: VehicleBodyType.MUV,
      variants: [
        {
          name: 'GX Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2393,
          seating: 7,
          priceInLakhs: 19.99,
        },
        {
          name: 'VX Diesel MT 8S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2393,
          seating: 8,
          priceInLakhs: 24.64,
        },
        {
          name: 'ZX Diesel MT 7S',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2393,
          seating: 7,
          priceInLakhs: 26.3,
        },
      ],
    },
    {
      brandSlug: 'toyota',
      name: 'Fortuner',
      slug: 'toyota-fortuner',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: '4x2 Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 2694,
          seating: 7,
          priceInLakhs: 33.43,
        },
        {
          name: '4x2 Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 2755,
          seating: 7,
          priceInLakhs: 38.21,
        },
        {
          name: '4x4 Diesel AT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.AUTOMATIC,
          engineCc: 2755,
          seating: 7,
          priceInLakhs: 42.32,
        },
      ],
    },

    // HONDA (2 models, 7 variants)
    {
      brandSlug: 'honda',
      name: 'Elevate',
      slug: 'honda-elevate',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'SV Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 11.69,
        },
        {
          name: 'V Petrol CVT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.CVT,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 13.41,
        },
        {
          name: 'ZX Petrol CVT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.CVT,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 16.43,
        },
      ],
    },
    {
      brandSlug: 'honda',
      name: 'City',
      slug: 'honda-city',
      bodyType: VehicleBodyType.SEDAN,
      variants: [
        {
          name: 'V Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 12.08,
        },
        {
          name: 'VX Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 13.49,
        },
        {
          name: 'ZX Petrol CVT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.CVT,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 16.35,
        },
        {
          name: 'e:HEV Strong Hybrid ZX',
          fuelType: VehicleFuelType.HYBRID,
          transmission: VehicleTransmission.CVT,
          engineCc: 1498,
          seating: 5,
          priceInLakhs: 20.55,
        },
      ],
    },

    // MG MOTOR (3 models, 9 variants)
    {
      brandSlug: 'mg-motor',
      name: 'Hector',
      slug: 'mg-hector',
      bodyType: VehicleBodyType.SUV,
      variants: [
        {
          name: 'Style Petrol MT',
          fuelType: VehicleFuelType.PETROL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1451,
          seating: 5,
          priceInLakhs: 13.99,
        },
        {
          name: 'Shine Pro Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 17.9,
        },
        {
          name: 'Sharp Pro Diesel MT',
          fuelType: VehicleFuelType.DIESEL,
          transmission: VehicleTransmission.MANUAL,
          engineCc: 1956,
          seating: 5,
          priceInLakhs: 21.7,
        },
      ],
    },
    {
      brandSlug: 'mg-motor',
      name: 'Windsor EV',
      slug: 'mg-windsor-ev',
      bodyType: VehicleBodyType.EV,
      variants: [
        {
          name: 'Excite 38kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 38.0,
          seating: 5,
          priceInLakhs: 13.5,
        },
        {
          name: 'Exclusive 38kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 38.0,
          seating: 5,
          priceInLakhs: 14.5,
        },
        {
          name: 'Essence 38kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 38.0,
          seating: 5,
          priceInLakhs: 15.5,
        },
      ],
    },
    {
      brandSlug: 'mg-motor',
      name: 'ZS EV',
      slug: 'mg-zs-ev',
      bodyType: VehicleBodyType.EV,
      variants: [
        {
          name: 'Executive 50.3kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 50.3,
          seating: 5,
          priceInLakhs: 18.98,
        },
        {
          name: 'Excite Pro 50.3kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 50.3,
          seating: 5,
          priceInLakhs: 19.98,
        },
        {
          name: 'Exclusive Plus 50.3kWh',
          fuelType: VehicleFuelType.ELECTRIC,
          transmission: VehicleTransmission.AUTOMATIC,
          batteryKwh: 50.3,
          seating: 5,
          priceInLakhs: 25.44,
        },
      ],
    },
  ];

  const allVariantEntities: any[] = [];
  let totalVariantsSeeded = 0;

  for (const m of catalogSpecs) {
    const brand = brandEntityMap.get(m.brandSlug);
    const carModel = await prisma.carModel.upsert({
      where: { brandId_slug: { brandId: brand.id, slug: m.slug } },
      create: {
        brandId: brand.id,
        name: m.name,
        slug: m.slug,
        bodyType: m.bodyType,
      },
      update: {},
    });

    for (const v of m.variants) {
      const exShowroomPaise = BigInt(Math.round(v.priceInLakhs * 100000 * 100));
      const variant = await prisma.variant.upsert({
        where: {
          carModelId_name_fuelType_transmission: {
            carModelId: carModel.id,
            name: v.name,
            fuelType: v.fuelType,
            transmission: v.transmission,
          },
        },
        create: {
          carModelId: carModel.id,
          name: v.name,
          fuelType: v.fuelType,
          transmission: v.transmission,
          engineCc: v.engineCc,
          batteryKwh: v.batteryKwh,
          seatingCapacity: v.seating,
          baseExShowroomPaise: exShowroomPaise,
          imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        },
        update: {
          baseExShowroomPaise: exShowroomPaise,
        },
      });

      allVariantEntities.push({
        ...variant,
        brandSlug: m.brandSlug,
        modelName: m.name,
        basePricePaise: exShowroomPaise,
      });
      totalVariantsSeeded++;

      // City price in MH
      await prisma.variantCityPrice.upsert({
        where: { variantId_zoneId: { variantId: variant.id, zoneId: mh.id } },
        create: { variantId: variant.id, zoneId: mh.id, exShowroomPaise },
        update: {},
      });
    }
  }

  console.log(
    `✅ Seeded ${catalogSpecs.length} Car Models and exactly ${totalVariantsSeeded} Variants across 8 Brands.`,
  );

  // ============================================================================
  // 4. DEALERSHIPS (15 Dealers Across MH, MP, KA with Authorizations & KYC)
  // ============================================================================
  console.log('🏢 [4/8] Seeding 15 Dealerships with Branches, KYC & Brand Authorizations...');

  interface DealerSeedData {
    legalName: string;
    tradeName: string;
    gstin: string;
    pan: string;
    phone: string;
    email: string;
    zone: any;
    address: string;
    pincode: string;
    lat: number;
    lng: number;
    authorizedBrandSlugs: string[];
    kycStatus: SellerKycStatus;
    feeStatus: SellerRegistrationFeeStatus;
  }

  const dealersData: DealerSeedData[] = [
    // MAHARASHTRA DEALERS (7)
    {
      legalName: 'Sahyadri Automotive Private Limited',
      tradeName: 'Sahyadri Automotive Group',
      gstin: '27AAMCS1234F1Z1',
      pan: 'AAMCS1234F',
      phone: '+919822000001',
      email: 'dealer.sahyadri@groupdrive.in',
      zone: baramatiTal,
      address: 'Plot 14-16, MIDC Industrial Area, Baramati-Patas Road',
      pincode: '413102',
      lat: 18.1519,
      lng: 74.577,
      authorizedBrandSlugs: ['mahindra', 'tata-motors'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Kalyani Automotive Private Limited',
      tradeName: 'Kalyani Motors Pune',
      gstin: '27AAACK5678G1Z2',
      pan: 'AAACK5678G',
      phone: '+919822000002',
      email: 'dealer.kalyani@groupdrive.in',
      zone: haveliTal,
      address: 'Survey 48/2, Magarpatta Road, Hadapsar, Pune',
      pincode: '411028',
      lat: 18.4967,
      lng: 73.9312,
      authorizedBrandSlugs: ['maruti-suzuki', 'hyundai'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Silver Jubilee Commercials Limited',
      tradeName: 'Silver Jubilee Mahindra Baramati',
      gstin: '27AAACS9988H1Z3',
      pan: 'AAACS9988H',
      phone: '+919822000003',
      email: 'dealer.silver@groupdrive.in',
      zone: baramatiTal,
      address: 'Indapur Road, Near Bypass Junction, Baramati',
      pincode: '413102',
      lat: 18.162,
      lng: 74.582,
      authorizedBrandSlugs: ['mahindra'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Panchjanya Automotive Services LLP',
      tradeName: 'Panchjanya Satara-Karad Auto',
      gstin: '27AAPCP3322J1Z4',
      pan: 'AAPCP3322J',
      phone: '+919822000004',
      email: 'dealer.panchjanya@groupdrive.in',
      zone: karadTal,
      address: 'NH-48 Service Road, Malkapur, Karad, Satara',
      pincode: '415110',
      lat: 17.2882,
      lng: 74.1837,
      authorizedBrandSlugs: ['tata-motors', 'mahindra'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Shanti Automotive Dealerships LLP',
      tradeName: 'Shanti Motors Kolhapur',
      gstin: '27AASPS7766K1Z5',
      pan: 'AASPS7766K',
      phone: '+919822000005',
      email: 'dealer.shanti@groupdrive.in',
      zone: hatkanangaleTal,
      address: 'Shiroli MIDC, Hatkanangale, Kolhapur',
      pincode: '416118',
      lat: 16.7454,
      lng: 74.4447,
      authorizedBrandSlugs: ['maruti-suzuki', 'toyota'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Suman Auto World Private Limited',
      tradeName: 'Suman Auto World Nashik',
      gstin: '27AAACS4455L1Z6',
      pan: 'AAACS4455L',
      phone: '+919822000006',
      email: 'dealer.suman@groupdrive.in',
      zone: niphadTal,
      address: 'Ozar Airport Road, Niphad Taluka, Nashik',
      pincode: '422206',
      lat: 20.0754,
      lng: 74.1083,
      authorizedBrandSlugs: ['tata-motors', 'hyundai'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Sai Point Automobiles & Tractors',
      tradeName: 'Sai Point Pandharpur',
      gstin: '27AAASP1122M1Z7',
      pan: 'AAASP1122M',
      phone: '+919822000007',
      email: 'dealer.saipoint@groupdrive.in',
      zone: pandharpurTal,
      address: 'Karkamb Road, Pandharpur, Solapur',
      pincode: '413304',
      lat: 17.6778,
      lng: 75.3283,
      authorizedBrandSlugs: ['mahindra', 'kia'],
      kycStatus: SellerKycStatus.SUBMITTED, // In admin KYB review queue
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },

    // MADHYA PRADESH DEALERS (5)
    {
      legalName: 'Patel Central India Motors Private Limited',
      tradeName: 'Patel Motors Indore',
      gstin: '23AABCP9911N1Z8',
      pan: 'AABCP9911N',
      phone: '+919822000008',
      email: 'dealer.patel@groupdrive.in',
      zone: depalpurTal,
      address: 'Betma Bypass Road, Depalpur, Indore',
      pincode: '453115',
      lat: 22.8532,
      lng: 75.5492,
      authorizedBrandSlugs: ['maruti-suzuki', 'tata-motors'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Malwa Vehicles & Logistics LLP',
      tradeName: 'Malwa Auto Hub Dhar',
      gstin: '23AALPM3344P1Z9',
      pan: 'AALPM3344P',
      phone: '+919822000009',
      email: 'dealer.malwa@groupdrive.in',
      zone: badnawarTal,
      address: 'Ratlam-Lebad Highway, Badnawar, Dhar',
      pincode: '454660',
      lat: 23.0183,
      lng: 75.2289,
      authorizedBrandSlugs: ['mahindra', 'toyota'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Rajshree Automobile Ventures Limited',
      tradeName: 'Rajshree Motors Ujjain',
      gstin: '23AAACR7788Q1ZA',
      pan: 'AAACR7788Q',
      phone: '+919822000010',
      email: 'dealer.rajshree@groupdrive.in',
      zone: nagdaTal,
      address: 'Industrial Area, Nagda, Ujjain',
      pincode: '456335',
      lat: 23.4542,
      lng: 75.4125,
      authorizedBrandSlugs: ['hyundai', 'honda'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Dewas Prime Wheels LLP',
      tradeName: 'Dewas Prime Auto',
      gstin: '23AADPD2233R1ZB',
      pan: 'AADPD2233R',
      phone: '+919822000011',
      email: 'dealer.dewasprime@groupdrive.in',
      zone: sonkatchTal,
      address: 'AB Road, Sonkatch, Dewas',
      pincode: '455118',
      lat: 22.9734,
      lng: 76.3812,
      authorizedBrandSlugs: ['kia', 'mg-motor'],
      kycStatus: SellerKycStatus.SUBMITTED, // In admin KYB review queue
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Nimar Automotive Agencies',
      tradeName: 'Nimar Auto Khargone',
      gstin: '23AABPN6677S1ZC',
      pan: 'AABPN6677S',
      phone: '+919822000012',
      email: 'dealer.nimar@groupdrive.in',
      zone: barwahTal,
      address: 'Mortakka Road, Barwah, Khargone',
      pincode: '451115',
      lat: 22.2533,
      lng: 76.0412,
      authorizedBrandSlugs: ['maruti-suzuki', 'mahindra'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },

    // KARNATAKA DEALERS (3)
    {
      legalName: 'Belgaum Sugars & Motorworks Private Limited',
      tradeName: 'Belgaum Sugar Belt Auto',
      gstin: '29AABCB5544T1ZD',
      pan: 'AABCB5544T',
      phone: '+919822000013',
      email: 'dealer.belgaum@groupdrive.in',
      zone: chikkodiTal,
      address: 'Sugar Factory Road, Chikkodi, Belagavi',
      pincode: '591201',
      lat: 16.4312,
      lng: 74.5983,
      authorizedBrandSlugs: ['mahindra', 'tata-motors'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Hubli-Dharwad Auto Gateway LLP',
      tradeName: 'Dharwad Gateway Auto',
      gstin: '29AAHDA8899U1ZE',
      pan: 'AAHDA8899U',
      phone: '+919822000014',
      email: 'dealer.dharwad@groupdrive.in',
      zone: navalgundTal,
      address: 'Kusugal Road, Navalgund, Dharwad',
      pincode: '582208',
      lat: 15.5683,
      lng: 75.3612,
      authorizedBrandSlugs: ['toyota', 'maruti-suzuki'],
      kycStatus: SellerKycStatus.VERIFIED,
      feeStatus: SellerRegistrationFeeStatus.PAID,
    },
    {
      legalName: 'Cauvery Motors Mysore LLP',
      tradeName: 'Cauvery Motors Hunsur',
      gstin: '29AACCM1133V1ZF',
      pan: 'AACCM1133V',
      phone: '+919822000015',
      email: 'dealer.cauvery@groupdrive.in',
      zone: hunsurTal,
      address: 'Biligere Circle, Hunsur, Mysuru',
      pincode: '571105',
      lat: 12.3083,
      lng: 76.2912,
      authorizedBrandSlugs: ['hyundai', 'kia', 'honda'],
      kycStatus: SellerKycStatus.DRAFT, // Draft dealer onboarding
      feeStatus: SellerRegistrationFeeStatus.UNPAID,
    },
  ];

  const accountBalances: Record<LedgerAccountType, bigint> = {
    BUYER_ESCROW_HOLD: 0n,
    PLATFORM_REVENUE: 0n,
    SELLER_RECEIVABLE: 0n,
    TAX_PAYABLE: 0n,
  };

  async function postDoubleEntryVoucher(
    entries: Array<{
      accountType: LedgerAccountType;
      debitPaise: bigint;
      creditPaise: bigint;
      actorId?: string;
      bookingId?: string;
      narration: string;
    }>,
  ) {
    const totalDebits = entries.reduce((sum, e) => sum + e.debitPaise, 0n);
    const totalCredits = entries.reduce((sum, e) => sum + e.creditPaise, 0n);
    if (totalDebits !== totalCredits) {
      throw new Error(
        `Double-entry unbalanced: Debits (${totalDebits}) != Credits (${totalCredits})`,
      );
    }

    for (const entry of entries) {
      if (entry.accountType === LedgerAccountType.BUYER_ESCROW_HOLD) {
        accountBalances[entry.accountType] += entry.debitPaise - entry.creditPaise;
      } else {
        accountBalances[entry.accountType] += entry.creditPaise - entry.debitPaise;
      }

      await prisma.ledgerEntry.create({
        data: {
          accountType: entry.accountType,
          actorId: entry.actorId,
          bookingId: entry.bookingId,
          debitPaise: entry.debitPaise,
          creditPaise: entry.creditPaise,
          balanceAfterPaise: accountBalances[entry.accountType],
          narration: entry.narration,
        },
      });
    }
  }

  const seededDealers: any[] = [];

  for (const d of dealersData) {
    let user = await prisma.user.findUnique({ where: { email: d.email } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { phone: d.phone } });
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: d.phone,
          email: d.email,
          role: UserRole.SELLER,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.SELLER },
      });
    }

    let sellerProfile = await prisma.sellerProfile.findFirst({
      where: { OR: [{ userId: user.id }, { gstin: d.gstin }] },
    });
    if (!sellerProfile) {
      sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          dealershipLegalName: d.legalName,
          tradeName: d.tradeName,
          gstin: d.gstin,
          panNumber: d.pan,
          kycStatus: d.kycStatus,
          registrationFeeStatus: d.feeStatus,
          commissionRatePercent: 1.0,
          primaryContactName: `${d.tradeName.split(' ')[0]} Manager`,
          primaryContactPhone: d.phone,
        },
      });
    } else {
      sellerProfile = await prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: {
          userId: user.id,
          dealershipLegalName: d.legalName,
          tradeName: d.tradeName,
          gstin: d.gstin,
          panNumber: d.pan,
          kycStatus: d.kycStatus,
          registrationFeeStatus: d.feeStatus,
        },
      });
    }

    // Create Main Branch
    const branch =
      (await prisma.sellerBranch.findFirst({
        where: { sellerProfileId: sellerProfile.id },
      })) ||
      (await prisma.sellerBranch.create({
        data: {
          sellerProfileId: sellerProfile.id,
          branchName: `${d.tradeName} - Main Facility`,
          zoneId: d.zone.id,
          address: d.address,
          pincode: d.pincode,
          latitude: d.lat,
          longitude: d.lng,
          contactPhone: d.phone,
          isHeadquarters: true,
        },
      }));

    // Brand Authorizations
    for (const bSlug of d.authorizedBrandSlugs) {
      const brand = brandEntityMap.get(bSlug);
      if (brand) {
        await prisma.sellerBrandAuthorization.upsert({
          where: {
            sellerProfileId_brandId: { sellerProfileId: sellerProfile.id, brandId: brand.id },
          },
          create: {
            sellerProfileId: sellerProfile.id,
            brandId: brand.id,
            certificateUrl: `https://storage.groupdrive.in/certs/${d.gstin}-${bSlug}.pdf`,
            validFrom: new Date('2023-01-01'),
            validUntil: new Date('2027-12-31'),
            isVerified: true,
          },
          update: {},
        });
      }
    }

    // KYC Documents
    const kycDocs = [
      {
        type: KycDocumentType.GST_CERTIFICATE,
        url: `https://storage.groupdrive.in/kyc/${d.gstin}/gst.pdf`,
      },
      {
        type: KycDocumentType.PAN_CARD,
        url: `https://storage.groupdrive.in/kyc/${d.gstin}/pan.pdf`,
      },
      {
        type: KycDocumentType.DEALERSHIP_AGREEMENT,
        url: `https://storage.groupdrive.in/kyc/${d.gstin}/agreement.pdf`,
      },
      {
        type: KycDocumentType.CANCELLED_CHEQUE,
        url: `https://storage.groupdrive.in/kyc/${d.gstin}/cheque.pdf`,
      },
    ];
    for (const doc of kycDocs) {
      await prisma.sellerKyc.create({
        data: {
          sellerProfileId: sellerProfile.id,
          documentType: doc.type,
          documentUrl: doc.url,
          verificationStatus:
            d.kycStatus === SellerKycStatus.VERIFIED
              ? KycVerificationStatus.VERIFIED
              : KycVerificationStatus.PENDING,
          verifiedAt: d.kycStatus === SellerKycStatus.VERIFIED ? new Date() : null,
        },
      });
    }

    // Registration Payment record if paid
    if (d.feeStatus === SellerRegistrationFeeStatus.PAID) {
      await prisma.sellerRegistrationPayment.create({
        data: {
          sellerProfileId: sellerProfile.id,
          amountPaise: BigInt(1999900),
          gstAmountPaise: BigInt(359982),
          totalAmountPaise: BigInt(2359882),
          status: PaymentStatus.CAPTURED,
          gatewayProvider: PaymentGatewayProvider.MOCK,
          gatewayPaymentRef: `PAY-REG-${d.pan}`,
          paidAt: new Date(Date.now() - 86400000 * 30),
        },
      });

      // Double-entry voucher: Cash Deposit = Revenue (82%) + GST (18%)
      await postDoubleEntryVoucher([
        {
          accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
          actorId: sellerProfile.id,
          debitPaise: BigInt(2359882),
          creditPaise: 0n,
          narration: `Dealer Onboarding Fee (₹19,999 + 18% GST) received from ${d.tradeName}`,
        },
        {
          accountType: LedgerAccountType.PLATFORM_REVENUE,
          actorId: sellerProfile.id,
          debitPaise: 0n,
          creditPaise: BigInt(1999900),
          narration: `Seller Registration Fee Revenue - ${d.tradeName}`,
        },
        {
          accountType: LedgerAccountType.TAX_PAYABLE,
          actorId: sellerProfile.id,
          debitPaise: 0n,
          creditPaise: BigInt(359982),
          narration: `18% GST Output on Seller Registration Fee - ${d.tradeName}`,
        },
      ]);
    }

    seededDealers.push({
      ...sellerProfile,
      branchId: branch.id,
      zone: d.zone,
      authorizedBrandSlugs: d.authorizedBrandSlugs,
    });
  }

  console.log(`✅ Seeded ${seededDealers.length} Dealership profiles across MH, MP and KA.`);

  // ============================================================================
  // 5. BUYER PROFILES (100 Rural and Semi-Urban Buyers)
  // ============================================================================
  console.log('👥 [5/8] Seeding 100 Rural and Semi-Urban Buyer Profiles...');

  const firstNames = [
    'Sanjay',
    'Amol',
    'Pravin',
    'Ganesh',
    'Nitin',
    'Dnyaneshwar',
    'Vijay',
    'Mahesh',
    'Sachin',
    'Sunil',
    'Vikas',
    'Rameshwar',
    'Deepak',
    'Rahul',
    'Ashok',
    'Radheshyam',
    'Mukesh',
    'Kamal',
    'Dharmendra',
    'Gopal',
    'Babulal',
    'Jagdish',
    'Narayan',
    'Hemant',
    'Suresh',
    'Rakesh',
    'Anil',
    'Bhagwan',
    'Santosh',
    'Kailas',
    'Basavaraj',
    'Mallikarjun',
    'Shivakumar',
    'Veeresh',
    'Praveen',
    'Manjunath',
    'Shivanand',
    'Anand',
    'Kiran',
    'Suresh',
    'Govind',
    'Balasaheb',
    'Tukaram',
    'Dattatray',
    'Pandurang',
    'Chandrakant',
    'Appasaheb',
    'Kashinath',
    'Vasant',
    'Baban',
    'Shankar',
    'Maruti',
    'Sitaram',
    'Madhavrao',
    'Sopan',
    'Sambhaji',
    'Anandrao',
    'Ramdas',
    'Kisanrao',
    'Subhash',
    'Channappa',
    'Shankarappa',
    'Ningappa',
    'Basappa',
    'Yallappa',
    'Kallappa',
    'Mahadev',
    'Girish',
    'Harish',
    'Pradeep',
    'Devendra',
    'Kishore',
    'Rajendra',
    'Vijayendra',
    'Chandrashekhar',
    'Ravindra',
    'Narendra',
    'Gajendra',
    'Harendra',
    'Jitendra',
    'Sunil',
    'Anil',
    'Pankaj',
    'Manoj',
    'Vinod',
    'Pramod',
    'Umesh',
    'Naresh',
    'Ramesh',
    'Suresh',
    'Kavita',
    'Sunita',
    'Rekha',
    'Pooja',
    'Shobha',
    'Swati',
    'Anita',
    'Vidya',
    'Mangal',
    'Archana',
  ];

  const lastNames = [
    'Jagtap',
    'Shinde',
    'More',
    'Gaikwad',
    'Pawar',
    'Kadam',
    'Salunkhe',
    'Jadhav',
    'Ghorpade',
    'Thorat',
    'Deshmukh',
    'Kale',
    'Wagh',
    'Patil',
    'Tambe',
    'Patidar',
    'Choudhary',
    'Sharma',
    'Rajput',
    'Verma',
    'Solanki',
    'Mukati',
    'Tomar',
    'Joshi',
    'Mandloi',
    'Malviya',
    'Bhosale',
    'Gite',
    'Jagdale',
    'Bhide',
    'Kulkarni',
    'Chougule',
    'Hiremath',
    'Kambale',
    'Kamat',
    'Bannur',
    'Koppad',
    'Angadi',
    'Shetti',
    'Hosmani',
    'Biradar',
    'Hegde',
    'Gowda',
    'Nayaka',
    'Naik',
    'Rathod',
    'Lohar',
    'Sutar',
    'Kumbhar',
    'Chavan',
  ];

  const seededBuyerProfiles: any[] = [];

  for (let i = 0; i < 100; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[(i * 3) % lastNames.length];
    const fullName = `${fName} ${lName}`;
    const zone = allTalukas[i % allTalukas.length];
    const phone = `+91970000${String(i + 1).padStart(4, '0')}`;
    const email = `buyer.${i + 1}@groupdrive.in`;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { phone } });
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          email,
          role: UserRole.BUYER,
          isActive: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.BUYER },
      });
    }

    const buyerProfile = await prisma.buyerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName,
        primaryZoneId: zone.id,
        pincode: zone.pincode || '413102',
        address: `${zone.name} Rural Post, Taluka ${zone.name}, Dist. Zone`,
      },
      update: {
        fullName,
        primaryZoneId: zone.id,
      },
    });

    seededBuyerProfiles.push({
      ...buyerProfile,
      fullName,
      zone,
      user,
    });
  }

  console.log(`✅ Seeded ${seededBuyerProfiles.length} active Buyer Profiles.`);

  // ============================================================================
  // 6. 25 GROUPS ACROSS THE LIFECYCLE (FORMING, QUORUM, RFQ, VOTING, BOOKED, DELIVERED)
  // ============================================================================
  console.log('🤝 [6/8] Seeding 25 Groups Across All 6 Lifecycle Stages...');

  // Helper for creating group with members
  let buyerIndex = 0;
  function getNextBuyers(count: number) {
    const buyers = [];
    for (let c = 0; c < count; c++) {
      buyers.push(seededBuyerProfiles[buyerIndex % seededBuyerProfiles.length]);
      buyerIndex++;
    }
    return buyers;
  }

  interface GroupDef {
    variantSlugPattern: string; // match variant
    zone: any;
    targetCount: number;
    currentCount: number;
    status: GroupStatus;
    deadlineDays: number;
  }

  // 25 groups spanning all stages
  const groupDefinitions: GroupDef[] = [
    // STAGE 1: FORMING (6 groups)
    {
      variantSlugPattern: 'Creative Plus Petrol MT',
      zone: baramatiTal,
      targetCount: 5,
      currentCount: 2,
      status: GroupStatus.FORMING,
      deadlineDays: 12,
    },
    {
      variantSlugPattern: 'Z4 Diesel MT 7S',
      zone: depalpurTal,
      targetCount: 5,
      currentCount: 1,
      status: GroupStatus.FORMING,
      deadlineDays: 14,
    },
    {
      variantSlugPattern: 'Sigma Petrol MT',
      zone: chikkodiTal,
      targetCount: 4,
      currentCount: 1,
      status: GroupStatus.FORMING,
      deadlineDays: 15,
    },
    {
      variantSlugPattern: 'Pure Petrol MT',
      zone: karadTal,
      targetCount: 3,
      currentCount: 1,
      status: GroupStatus.FORMING,
      deadlineDays: 10,
    },
    {
      variantSlugPattern: 'EX Petrol MT',
      zone: badnawarTal,
      targetCount: 4,
      currentCount: 2,
      status: GroupStatus.FORMING,
      deadlineDays: 11,
    },
    {
      variantSlugPattern: 'E NeoDrive MT',
      zone: navalgundTal,
      targetCount: 5,
      currentCount: 2,
      status: GroupStatus.FORMING,
      deadlineDays: 9,
    },

    // STAGE 2: QUORUM_REACHED (5 groups - ready to issue RFQ)
    {
      variantSlugPattern: 'ZXi Smart Hybrid AT',
      zone: baramatiTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.QUORUM_REACHED,
      deadlineDays: 7,
    },
    {
      variantSlugPattern: 'Accomplished Petrol MT',
      zone: sangamnerTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.QUORUM_REACHED,
      deadlineDays: 6,
    },
    {
      variantSlugPattern: 'N4 Diesel MT',
      zone: chikkodiTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.QUORUM_REACHED,
      deadlineDays: 5,
    },
    {
      variantSlugPattern: 'VXi Petrol MT',
      zone: depalpurTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.QUORUM_REACHED,
      deadlineDays: 8,
    },
    {
      variantSlugPattern: 'S(O) Petrol MT',
      zone: hatkanangaleTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.QUORUM_REACHED,
      deadlineDays: 4,
    },

    // STAGE 3: RFQ_ACTIVE / SEALED_BIDDING (4 groups - dealers bidding)
    {
      variantSlugPattern: 'Z8 Select Diesel MT 7S',
      zone: karadTal,
      targetCount: 5,
      currentCount: 5,
      status: GroupStatus.RFQ_ACTIVE,
      deadlineDays: 4,
    },
    {
      variantSlugPattern: 'Creative Plus Petrol MT',
      zone: depalpurTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.RFQ_ACTIVE,
      deadlineDays: 3,
    },
    {
      variantSlugPattern: 'Sigma Petrol MT',
      zone: athaniTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.RFQ_ACTIVE,
      deadlineDays: 5,
    },
    {
      variantSlugPattern: 'HTK Plus Petrol MT',
      zone: shirurTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.RFQ_ACTIVE,
      deadlineDays: 2,
    },

    // STAGE 4: VOTING_OPEN (4 groups - sealed bids unsealed & normalized, members voting)
    {
      variantSlugPattern: 'Z4 Diesel MT 7S',
      zone: baramatiTal,
      targetCount: 5,
      currentCount: 5,
      status: GroupStatus.VOTING_OPEN,
      deadlineDays: 2,
    },
    {
      variantSlugPattern: 'ZXi Smart Hybrid AT',
      zone: sanwerTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.VOTING_OPEN,
      deadlineDays: 3,
    },
    {
      variantSlugPattern: 'Smart Diesel MT',
      zone: chikkodiTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.VOTING_OPEN,
      deadlineDays: 2,
    },
    {
      variantSlugPattern: 'SX Tech Petrol IVT',
      zone: haveliTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.VOTING_OPEN,
      deadlineDays: 1,
    },

    // STAGE 5: DEAL_LOCKED / BOOKED (3 groups - winning dealer picked, token paid)
    {
      variantSlugPattern: 'Creative Plus Petrol MT',
      zone: baramatiTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.DEAL_LOCKED,
      deadlineDays: -2,
    },
    {
      variantSlugPattern: 'Z8 Select Diesel MT 7S',
      zone: depalpurTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.DEAL_LOCKED,
      deadlineDays: -3,
    },
    {
      variantSlugPattern: 'Alpha AllGrip AWD MT',
      zone: chikkodiTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.DEAL_LOCKED,
      deadlineDays: -1,
    },

    // STAGE 6: COMPLETED / DELIVERED (3 groups - doorstep delivered, settled, reviewed)
    {
      variantSlugPattern: 'Z4 Diesel MT 7S',
      zone: baramatiTal,
      targetCount: 5,
      currentCount: 5,
      status: GroupStatus.COMPLETED,
      deadlineDays: -15,
    },
    {
      variantSlugPattern: 'ZXi Smart Hybrid AT',
      zone: depalpurTal,
      targetCount: 4,
      currentCount: 4,
      status: GroupStatus.COMPLETED,
      deadlineDays: -20,
    },
    {
      variantSlugPattern: 'Smart Diesel MT',
      zone: karadTal,
      targetCount: 3,
      currentCount: 3,
      status: GroupStatus.COMPLETED,
      deadlineDays: -25,
    },
  ];

  let cumulativeLedgerBalance = BigInt(0);

  for (let gIdx = 0; gIdx < groupDefinitions.length; gIdx++) {
    const gDef = groupDefinitions[gIdx];
    const targetVariant =
      allVariantEntities.find((v) => v.name.includes(gDef.variantSlugPattern)) ||
      allVariantEntities[gIdx % allVariantEntities.length];

    const group = await prisma.group.create({
      data: {
        variantId: targetVariant.id,
        targetZoneId: gDef.zone.id,
        targetCount: gDef.targetCount,
        currentCount: gDef.currentCount,
        status: gDef.status,
        deadline: new Date(Date.now() + 86400000 * gDef.deadlineDays),
        quorumReachedAt:
          gDef.status !== GroupStatus.FORMING ? new Date(Date.now() - 86400000 * 5) : null,
        dealLockedAt: ([GroupStatus.DEAL_LOCKED, GroupStatus.COMPLETED] as GroupStatus[]).includes(
          gDef.status,
        )
          ? new Date(Date.now() - 86400000 * 2)
          : null,
      },
    });

    // Add members
    const groupBuyers = getNextBuyers(gDef.currentCount);
    const createdMemberships = [];
    for (let mIdx = 0; mIdx < groupBuyers.length; mIdx++) {
      const b = groupBuyers[mIdx];
      const m = await prisma.membership.create({
        data: {
          groupId: group.id,
          buyerProfileId: b.id,
          tokenPaidPaise: BigInt(500000), // ₹5,000 commitment token
          status: MembershipStatus.ACTIVE,
        },
      });
      createdMemberships.push(m);

      // Double-entry voucher: Cash Deposit into Escrow = Escrow Liability to Member
      await postDoubleEntryVoucher([
        {
          accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
          actorId: b.id,
          debitPaise: BigInt(500000),
          creditPaise: 0n,
          narration: `Buyer commitment token deposit by ${b.fullName} for group ${group.id.slice(0, 8)}`,
        },
        {
          accountType: LedgerAccountType.SELLER_RECEIVABLE,
          actorId: b.id,
          debitPaise: 0n,
          creditPaise: BigInt(500000),
          narration: `Escrow liability held for group ${group.id.slice(0, 8)}`,
        },
      ]);
    }

    // Attach RFQs and Quotes for stages >= RFQ_ACTIVE
    if (
      (
        [
          GroupStatus.RFQ_ACTIVE,
          GroupStatus.VOTING_OPEN,
          GroupStatus.DEAL_LOCKED,
          GroupStatus.COMPLETED,
        ] as GroupStatus[]
      ).includes(gDef.status)
    ) {
      const rfqStatus =
        gDef.status === GroupStatus.RFQ_ACTIVE
          ? RfqStatus.SEALED_BIDDING
          : gDef.status === GroupStatus.VOTING_OPEN
            ? RfqStatus.VOTING_OPEN
            : RfqStatus.AWARDED;

      const rfq = await prisma.rFQ.create({
        data: {
          groupId: group.id,
          rfqNumber: `RFQ-${gDef.zone.code}-${String(gIdx + 1).padStart(4, '0')}`,
          status: rfqStatus,
          bidWindowClosesAt: new Date(
            Date.now() + (rfqStatus === RfqStatus.SEALED_BIDDING ? 86400000 * 2 : -86400000 * 1),
          ),
          votingClosesAt: new Date(
            Date.now() + (rfqStatus === RfqStatus.VOTING_OPEN ? 86400000 * 2 : -86400000 * 1),
          ),
        },
      });

      // Find matching authorized dealers
      const eligibleDealers = seededDealers.filter((d) =>
        d.authorizedBrandSlugs.includes(targetVariant.brandSlug),
      );
      const dealersToBid = eligibleDealers.slice(0, 2);

      let winningQuoteId: string | null = null;
      let winningQuoteEntity: any = null;

      for (let qIdx = 0; qIdx < dealersToBid.length; qIdx++) {
        const dealer = dealersToBid[qIdx];
        const baseExShowroom = targetVariant.basePricePaise;
        const discountPaise = BigInt(Math.round(Number(baseExShowroom) * (0.04 + qIdx * 0.015))); // 4% - 5.5% group discount
        const logisticsPaise = BigInt(1200000 + qIdx * 400000); // 12k - 16k
        const rtoPaise = BigInt(Math.round(Number(baseExShowroom) * 0.12)); // ~12% RTO
        const insurancePaise = BigInt(5200000 + qIdx * 300000);
        const fastagPaise = BigInt(250000);
        const tcsPaise =
          Number(baseExShowroom) > 100000000
            ? BigInt(Math.round(Number(baseExShowroom) * 0.01))
            : BigInt(0);
        const landedCostPaise =
          baseExShowroom -
          discountPaise +
          logisticsPaise +
          rtoPaise +
          insurancePaise +
          fastagPaise +
          tcsPaise;

        const isWinning = qIdx === 0;

        const quote = await prisma.quote.create({
          data: {
            rfqId: rfq.id,
            sellerProfileId: dealer.id,
            branchId: dealer.branchId,
            status:
              gDef.status === GroupStatus.RFQ_ACTIVE ? QuoteStatus.SEALED : QuoteStatus.NORMALIZED,
            exShowroomPaise: baseExShowroom,
            batchGroupDiscountPaise: discountPaise,
            dealerLogisticsToZonePaise: logisticsPaise,
            roadTaxRtoPaise: rtoPaise,
            insuranceEstimatePaise: insurancePaise,
            fastagRegistrationCessPaise: fastagPaise,
            tcsPaise,
            totalLandedCostPaise: landedCostPaise,
            deliveryTimelineDays: 14 + qIdx * 5,
            validityDate: new Date(Date.now() + 86400000 * 20),
            notes: `${dealer.tradeName}: Direct dispatch batch discount for ${gDef.zone.name} buyers.`,
          },
        });

        if (isWinning) {
          winningQuoteId = quote.id;
          winningQuoteEntity = quote;
        }

        // Line items
        await prisma.quoteLineItem.createMany({
          data: [
            {
              quoteId: quote.id,
              category: QuoteLineItemCategory.EX_SHOWROOM,
              description: 'OEM Ex-showroom Price',
              amountPaise: baseExShowroom,
            },
            {
              quoteId: quote.id,
              category: QuoteLineItemCategory.DISCOUNT,
              description: 'Group Drive Volume Concession',
              amountPaise: -discountPaise,
            },
            {
              quoteId: quote.id,
              category: QuoteLineItemCategory.LOGISTICS,
              description: 'Stockyard to Rural Transit',
              amountPaise: logisticsPaise,
            },
            {
              quoteId: quote.id,
              category: QuoteLineItemCategory.RTO_TAX,
              description: 'State Road Tax Registration',
              amountPaise: rtoPaise,
            },
            {
              quoteId: quote.id,
              category: QuoteLineItemCategory.INSURANCE,
              description: 'Comprehensive Bumper-to-Bumper Insurance',
              amountPaise: insurancePaise,
            },
          ],
        });
      }

      // If VOTING_OPEN, register buyer votes
      if (gDef.status === GroupStatus.VOTING_OPEN && winningQuoteId) {
        for (let vIdx = 0; vIdx < createdMemberships.length; vIdx++) {
          await prisma.vote.create({
            data: {
              rfqId: rfq.id,
              membershipId: createdMemberships[vIdx].id,
              buyerProfileId: createdMemberships[vIdx].buyerProfileId,
              quoteId: winningQuoteId,
            },
          });
        }
      }

      // If DEAL_LOCKED or COMPLETED: set winningQuote, create Bookings
      if (
        ([GroupStatus.DEAL_LOCKED, GroupStatus.COMPLETED] as GroupStatus[]).includes(gDef.status) &&
        winningQuoteId &&
        winningQuoteEntity
      ) {
        await prisma.rFQ.update({
          where: { id: rfq.id },
          data: { winningQuoteId },
        });

        const isCompleted = gDef.status === GroupStatus.COMPLETED;

        for (let bIdx = 0; bIdx < createdMemberships.length; bIdx++) {
          const m = createdMemberships[bIdx];
          const bookingNum = `BK-${gDef.zone.code}-${String(gIdx * 10 + bIdx + 1).padStart(5, '0')}`;

          const booking = await prisma.booking.create({
            data: {
              bookingNumber: bookingNum,
              membershipId: m.id,
              quoteId: winningQuoteId,
              status: isCompleted ? BookingStatus.FULFILLED : BookingStatus.TOKEN_CONFIRMED,
              totalOnRoadPaise: winningQuoteEntity.totalLandedCostPaise,
              tokenAmountPaise: BigInt(500000),
              balanceAmountPaise: winningQuoteEntity.totalLandedCostPaise - BigInt(500000),
              chassisNumber: `MA3NC${String(gIdx + 1).padStart(2, '0')}S${String(bIdx + 1).padStart(4, '0')}00`,
              registrationNumber: isCompleted
                ? `${gDef.zone.code}-12-AB-${String(1000 + bIdx)}`
                : null,
            },
          });

          // If Completed: Add Delivery Shipment, Milestones, Settlement, Ledger Settlement & Review!
          if (isCompleted) {
            const dealer = seededDealers.find((d) => d.id === winningQuoteEntity.sellerProfileId)!;

            // Delivery Shipment
            const shipment = await prisma.deliveryShipment.create({
              data: {
                bookingId: booking.id,
                logisticsProvider: 'GroupDrive Regional Fleet Logistics',
                driverName: 'Vikram Singh Rathore',
                driverPhone: '+919822998877',
                trackingNumber: `TRK-GD-${bookingNum}`,
                originBranchId: dealer.branchId,
                destinationZoneId: gDef.zone.id,
                status: DeliveryStatus.DOORSTEP_DELIVERED,
                estimatedDeliveryAt: new Date(Date.now() - 86400000 * 5),
                actualDeliveredAt: new Date(Date.now() - 86400000 * 4),
              },
            });

            // Milestones
            await prisma.shipmentMilestone.createMany({
              data: [
                {
                  shipmentId: shipment.id,
                  title: 'Dispatched from Stockyard',
                  locationName: `${dealer.tradeName} Yard`,
                  timestamp: new Date(Date.now() - 86400000 * 8),
                },
                {
                  shipmentId: shipment.id,
                  title: 'In Transit on Rural Highway',
                  locationName: `NH Service Toll`,
                  timestamp: new Date(Date.now() - 86400000 * 6),
                },
                {
                  shipmentId: shipment.id,
                  title: 'Arrived at Destination Hub',
                  locationName: `${gDef.zone.name} Delivery Center`,
                  timestamp: new Date(Date.now() - 86400000 * 5),
                },
                {
                  shipmentId: shipment.id,
                  title: 'Doorstep Delivered & Inspected',
                  locationName: 'Buyer Doorstep',
                  timestamp: new Date(Date.now() - 86400000 * 4),
                  proofPhotoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400',
                },
              ],
            });

            // Commission Settlement (1% of deal value + 18% GST)
            const grossVal = winningQuoteEntity.totalLandedCostPaise;
            const commissionPaise = BigInt(Math.round(Number(grossVal) * 0.01)); // 1% gross commission
            const gstPaise = BigInt(Math.round((Number(commissionPaise) * 0.18) / 1.18)); // 18% GST component
            const netCommissionRevenue = commissionPaise - gstPaise;
            const netSellerPayable = grossVal - commissionPaise;

            await prisma.settlement.create({
              data: {
                bookingId: booking.id,
                sellerProfileId: dealer.id,
                grossDealValuePaise: grossVal,
                commissionPercent: 1.0,
                platformCommissionPaise: commissionPaise,
                netPayableToSellerPaise: netSellerPayable,
                status: SettlementStatus.PROCESSED,
                settledAt: new Date(Date.now() - 86400000 * 3),
              },
            });

            // Double Entry Ledger for Completed Settlement
            // Balanced voucher: Debits (grossVal) == Credits (netSellerPayable + netCommission + gst)
            await postDoubleEntryVoucher([
              {
                accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
                bookingId: booking.id,
                actorId: m.buyerProfileId,
                debitPaise: grossVal,
                creditPaise: 0n,
                narration: `Vehicle full on-road amount cleared into settlement pool for ${bookingNum}`,
              },
              {
                accountType: LedgerAccountType.SELLER_RECEIVABLE,
                bookingId: booking.id,
                actorId: dealer.id,
                debitPaise: 0n,
                creditPaise: netSellerPayable,
                narration: `Net dealer payout for confirmed delivery of ${bookingNum}`,
              },
              {
                accountType: LedgerAccountType.PLATFORM_REVENUE,
                bookingId: booking.id,
                actorId: dealer.id,
                debitPaise: 0n,
                creditPaise: netCommissionRevenue,
                narration: `1% Net Platform Commission for Booking ${bookingNum}`,
              },
              {
                accountType: LedgerAccountType.TAX_PAYABLE,
                bookingId: booking.id,
                actorId: dealer.id,
                debitPaise: 0n,
                creditPaise: gstPaise,
                narration: `18% GST Output on Platform Commission for ${bookingNum}`,
              },
            ]);

            // 3. Buyer Review & Rating
            const buyer = seededBuyerProfiles.find((bp) => bp.id === m.buyerProfileId)!;
            const reviewComments = [
              'Outstanding reverse auction savings! Group discount was ₹65,000 better than the local quote.',
              'Doorstep delivery in Baramati was smooth. Vehicle arrived clean with all RTO papers verified.',
              'Excellent collective bargaining experience. The dealer was professional and honored all promised extras.',
            ];
            await prisma.review.create({
              data: {
                bookingId: booking.id,
                buyerProfileId: buyer.id,
                sellerProfileId: dealer.id,
                rating: 5,
                title: 'Transparent pricing & flawless doorstep delivery!',
                comment: reviewComments[bIdx % reviewComments.length],
              },
            });
          }
        }
      }
    }
  }

  console.log(`✅ Seeded 25 Groups across all lifecycle stages.`);

  // ============================================================================
  // 7. OFFERED VEHICLES (40 Units across CLEARANCE, DEMO, PREVIOUS_YEAR)
  // ============================================================================
  console.log(
    '🏷️ [7/8] Seeding 40 Offered Vehicles Across Clearance, Demo & Previous Year Stock...',
  );

  const conditionDistribution: VehicleConditionType[] = [
    VehicleConditionType.CLEARANCE,
    VehicleConditionType.DEMO,
    VehicleConditionType.PREVIOUS_YEAR,
  ];

  const colors = [
    'Daytona Grey',
    'Abyss Black',
    'Deep Forest',
    'Pearl Arctic White',
    'Magma Grey',
    'Fiery Red',
    'Aurora Silver',
    'Tornado Blue',
  ];

  for (let oIdx = 0; oIdx < 40; oIdx++) {
    const condition = conditionDistribution[oIdx % conditionDistribution.length];
    const dealer = seededDealers[oIdx % seededDealers.length];
    // Find variant for one of dealer's authorized brands
    const dealerBrandVariants = allVariantEntities.filter((v) =>
      dealer.authorizedBrandSlugs.includes(v.brandSlug),
    );
    const variant =
      dealerBrandVariants[oIdx % dealerBrandVariants.length] ||
      allVariantEntities[oIdx % allVariantEntities.length];

    const regPrice = variant.basePricePaise;
    const discountPct =
      condition === VehicleConditionType.CLEARANCE
        ? 0.12
        : condition === VehicleConditionType.DEMO
          ? 0.18
          : 0.09;
    const offPrice = BigInt(Math.round(Number(regPrice) * (1 - discountPct)));
    const odo = condition === VehicleConditionType.DEMO ? 450 + oIdx * 120 : 0;
    const year = condition === VehicleConditionType.PREVIOUS_YEAR ? 2023 : 2024;
    const vin = `MA3${dealer.tradeName.slice(0, 3).toUpperCase()}${String(oIdx + 1).padStart(3, '0')}VIN${String(year).slice(2)}${String(1000 + oIdx)}`;

    await prisma.offeredVehicle.upsert({
      where: { vin },
      create: {
        sellerProfileId: dealer.id,
        branchId: dealer.branchId,
        variantId: variant.id,
        vin,
        manufactureYear: year,
        conditionType: condition,
        odometerKm: odo,
        color: colors[oIdx % colors.length],
        regularPricePaise: regPrice,
        discountedPricePaise: offPrice,
        imageUrl:
          variant.imageUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        isAvailable: true,
      },
      update: {},
    });
  }

  console.log(`✅ Seeded 40 Offered Vehicles with realistic discounts and verified VINs.`);

  // ============================================================================
  // 8. SUMMARY AUDIT & VERIFICATION
  // ============================================================================
  console.log('\n📊 [8/8] Verification Summary:');
  const countZones = await prisma.zone.count();
  const countBrands = await prisma.brand.count();
  const countModels = await prisma.carModel.count();
  const countVariants = await prisma.variant.count();
  const countDealers = await prisma.sellerProfile.count();
  const countBuyers = await prisma.buyerProfile.count();
  const countGroups = await prisma.group.count();
  const countOffers = await prisma.offeredVehicle.count();
  const countBookings = await prisma.booking.count();
  const countReviews = await prisma.review.count();

  console.log(`  - Administrative Zones:   ${countZones} (across MH, MP, KA)`);
  console.log(`  - Brands Seeded:          ${countBrands} / 8`);
  console.log(`  - Car Models Seeded:      ${countModels} / 30`);
  console.log(`  - Car Variants Seeded:    ${countVariants} / 100`);
  console.log(`  - Dealerships Seeded:     ${countDealers} / 15`);
  console.log(`  - Buyer Profiles Seeded:  ${countBuyers} / 100`);
  console.log(`  - Groups Seeded:          ${countGroups} / 25`);
  console.log(`  - Offered Vehicles:       ${countOffers} / 40`);
  console.log(`  - Fulfilled Deals:        ${countBookings}`);
  console.log(`  - Buyer Reviews:          ${countReviews}`);

  console.log('\n🎉 GroupDrive Master Demo Dataset Seed Completed Successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Demo Seed failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
