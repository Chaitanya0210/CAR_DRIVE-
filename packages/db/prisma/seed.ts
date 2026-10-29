import {
  PrismaClient,
  UserRole,
  SellerKycStatus,
  SellerRegistrationFeeStatus,
  KycDocumentType,
  KycVerificationStatus,
  PaymentStatus,
  PaymentGatewayProvider,
  ZoneLevel,
  ZoneDensityClass,
  VehicleFuelType,
  VehicleTransmission,
  VehicleBodyType,
  GroupStatus,
  MembershipStatus,
  RfqStatus,
  QuoteStatus,
  LedgerAccountType,
} from '@prisma/client';
import { applyDatabaseTriggers } from '../scripts/apply-triggers';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting GroupDrive Master Database Seed...');

  // 0. Ensure append-only DB triggers are in place
  await applyDatabaseTriggers(prisma);

  // ----------------------------------------------------------------------------
  // 1. SEED ZONE HIERARCHY (Maharashtra & Madhya Pradesh)
  // Hierarchy: State > District > Taluka > Village/Pincode
  // ----------------------------------------------------------------------------
  console.log('📍 Seeding Indian Administrative Zone Hierarchy (MH & MP)...');

  // Helper for top-level states
  async function upsertStateZone(name: string, code: string, lat: number, lng: number, gstCode: number) {
    const existing = await prisma.zone.findFirst({
      where: { code, level: ZoneLevel.STATE },
    });
    if (existing) return existing;
    return prisma.zone.create({
      data: {
        name,
        code,
        level: ZoneLevel.STATE,
        densityClass: ZoneDensityClass.URBAN,
        latitude: lat,
        longitude: lng,
        metadata: { gstStateCode: gstCode },
      },
    });
  }

  // 1.1 States
  const maharashtra = await upsertStateZone('Maharashtra', 'MH', 19.7515, 75.7139, 27);
  const madhyaPradesh = await upsertStateZone('Madhya Pradesh', 'MP', 22.9734, 78.6569, 23);

  // Helper for child zones
  async function upsertChildZone(
    name: string,
    code: string,
    level: ZoneLevel,
    densityClass: ZoneDensityClass,
    parentId: string,
    pincode?: string,
    latitude?: number,
    longitude?: number
  ) {
    const existing = await prisma.zone.findFirst({
      where: { parentId, code },
    });
    if (existing) return existing;
    return prisma.zone.create({
      data: {
        name,
        code,
        level,
        densityClass,
        parentId,
        pincode,
        latitude,
        longitude,
      },
    });
  }

  // --- MAHARASHTRA DISTRICTS ---
  const puneDist = await upsertChildZone('Pune', 'PUN', ZoneLevel.DISTRICT, ZoneDensityClass.URBAN, maharashtra.id, undefined, 18.5204, 73.8567);
  const sataraDist = await upsertChildZone('Satara', 'SAT', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, maharashtra.id, undefined, 17.6805, 74.0183);
  const ahmednagarDist = await upsertChildZone('Ahmednagar', 'AHM', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, maharashtra.id, undefined, 19.0948, 74.748);
  const nashikDist = await upsertChildZone('Nashik', 'NAS', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, maharashtra.id, undefined, 19.9975, 73.7898);
  const solapurDist = await upsertChildZone('Solapur', 'SOL', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, maharashtra.id, undefined, 17.6599, 75.9064);
  const kolhapurDist = await upsertChildZone('Kolhapur', 'KOL', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, maharashtra.id, undefined, 16.705, 74.2433);
  const sambhajinagarDist = await upsertChildZone('Chhatrapati Sambhajinagar', 'CSN', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, maharashtra.id, undefined, 19.8762, 75.3433);
  const nagpurDist = await upsertChildZone('Nagpur', 'NAG', ZoneLevel.DISTRICT, ZoneDensityClass.URBAN, maharashtra.id, undefined, 21.1458, 79.0882);
  const amravatiDist = await upsertChildZone('Amravati', 'AMR', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, maharashtra.id, undefined, 20.9374, 77.7796);
  const thaneDist = await upsertChildZone('Thane', 'THA', ZoneLevel.DISTRICT, ZoneDensityClass.METRO, maharashtra.id, undefined, 19.2183, 72.9781);

  // Pune Talukas & Pincodes
  const baramatiTaluka = await upsertChildZone('Baramati', 'TAL-BARAMATI', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, puneDist.id, undefined, 18.1519, 74.577);
  const haveliTaluka = await upsertChildZone('Haveli', 'TAL-HAVELI', ZoneLevel.TALUKA, ZoneDensityClass.SEMI_URBAN, puneDist.id, undefined, 18.4967, 73.9312);
  const junnarTaluka = await upsertChildZone('Junnar', 'TAL-JUNNAR', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, puneDist.id, undefined, 19.2064, 73.8763);
  const shirurTaluka = await upsertChildZone('Shirur', 'TAL-SHIRUR', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, puneDist.id, undefined, 18.8267, 74.3789);

  // Pincodes in Baramati
  await upsertChildZone('Baramati Town', 'PIN-413102', ZoneLevel.VILLAGE_PINCODE, ZoneDensityClass.RURAL, baramatiTaluka.id, '413102', 18.1519, 74.577);
  await upsertChildZone('Malegaon Budruk', 'PIN-413115', ZoneLevel.VILLAGE_PINCODE, ZoneDensityClass.RURAL, baramatiTaluka.id, '413115', 18.1254, 74.5312);

  // Satara Talukas
  const karadTaluka = await upsertChildZone('Karad', 'TAL-KARAD', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, sataraDist.id, undefined, 17.2882, 74.1837);
  const phaltanTaluka = await upsertChildZone('Phaltan', 'TAL-PHALTAN', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, sataraDist.id, undefined, 17.9866, 74.4312);

  // Ahmednagar Talukas
  const sangamnerTaluka = await upsertChildZone('Sangamner', 'TAL-SANGAMNER', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, ahmednagarDist.id, undefined, 19.5772, 74.2094);
  const shrirampurTaluka = await upsertChildZone('Shrirampur', 'TAL-SHRIRAMPUR', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, ahmednagarDist.id, undefined, 19.6192, 74.6575);

  // --- MADHYA PRADESH DISTRICTS ---
  const indoreDist = await upsertChildZone('Indore', 'IND', ZoneLevel.DISTRICT, ZoneDensityClass.URBAN, madhyaPradesh.id, undefined, 22.7196, 75.8577);
  const dharDist = await upsertChildZone('Dhar', 'DHA', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, madhyaPradesh.id, undefined, 22.5978, 75.2974);
  const khargoneDist = await upsertChildZone('Khargone', 'KHA', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, madhyaPradesh.id, undefined, 21.8236, 75.6171);
  const ujjainDist = await upsertChildZone('Ujjain', 'UJJ', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, madhyaPradesh.id, undefined, 23.1765, 75.7885);
  const bhopalDist = await upsertChildZone('Bhopal', 'BHO', ZoneLevel.DISTRICT, ZoneDensityClass.URBAN, madhyaPradesh.id, undefined, 23.2599, 77.4126);
  const dewasDist = await upsertChildZone('Dewas', 'DEW', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, madhyaPradesh.id, undefined, 22.9676, 76.0534);
  const gwaliorDist = await upsertChildZone('Gwalior', 'GWA', ZoneLevel.DISTRICT, ZoneDensityClass.URBAN, madhyaPradesh.id, undefined, 26.2183, 78.1828);
  const jabalpurDist = await upsertChildZone('Jabalpur', 'JAB', ZoneLevel.DISTRICT, ZoneDensityClass.SEMI_URBAN, madhyaPradesh.id, undefined, 23.1815, 79.9864);
  const sagarDist = await upsertChildZone('Sagar', 'SAG', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, madhyaPradesh.id, undefined, 23.8388, 78.7378);
  const rewaDist = await upsertChildZone('Rewa', 'REW', ZoneLevel.DISTRICT, ZoneDensityClass.RURAL, madhyaPradesh.id, undefined, 24.5362, 81.3037);

  // Indore & Dhar Talukas
  const depalpurTaluka = await upsertChildZone('Depalpur', 'TAL-DEPALPUR', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, indoreDist.id, undefined, 22.8532, 75.5492);
  const sanwerTaluka = await upsertChildZone('Sanwer', 'TAL-SANWER', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, indoreDist.id, undefined, 22.9774, 75.8285);
  const badnawarTaluka = await upsertChildZone('Badnawar', 'TAL-BADNAWAR', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, dharDist.id, undefined, 23.0183, 75.2289);
  const kukshiTaluka = await upsertChildZone('Kukshi', 'TAL-KUKSHI', ZoneLevel.TALUKA, ZoneDensityClass.RURAL, dharDist.id, undefined, 22.2039, 74.7571);

  // Pincode in Depalpur
  await upsertChildZone('Depalpur Town', 'PIN-453115', ZoneLevel.VILLAGE_PINCODE, ZoneDensityClass.RURAL, depalpurTaluka.id, '453115', 22.8532, 75.5492);

  // ----------------------------------------------------------------------------
  // 2. SEED REGULATORY STATE TAX CONFIGS
  // ----------------------------------------------------------------------------
  console.log('⚖️ Seeding State Tax Config (Road Tax & RTO Rates)...');

  const taxEntries = [
    // Maharashtra
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.PETROL, minPricePaise: BigInt(0), maxPricePaise: BigInt(100000000), taxPercent: 11.0 },
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.PETROL, minPricePaise: BigInt(100000001), maxPricePaise: BigInt(200000000), taxPercent: 12.0 },
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.DIESEL, minPricePaise: BigInt(0), maxPricePaise: BigInt(100000000), taxPercent: 13.0 },
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.DIESEL, minPricePaise: BigInt(100000001), maxPricePaise: BigInt(200000000), taxPercent: 14.0 },
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.CNG, minPricePaise: BigInt(0), maxPricePaise: BigInt(200000000), taxPercent: 7.0 },
    { zoneId: maharashtra.id, fuelType: VehicleFuelType.ELECTRIC, minPricePaise: BigInt(0), maxPricePaise: BigInt(500000000), taxPercent: 0.0 },
    // Madhya Pradesh
    { zoneId: madhyaPradesh.id, fuelType: VehicleFuelType.PETROL, minPricePaise: BigInt(0), maxPricePaise: BigInt(100000000), taxPercent: 8.0 },
    { zoneId: madhyaPradesh.id, fuelType: VehicleFuelType.DIESEL, minPricePaise: BigInt(0), maxPricePaise: BigInt(100000000), taxPercent: 10.0 },
    { zoneId: madhyaPradesh.id, fuelType: VehicleFuelType.CNG, minPricePaise: BigInt(0), maxPricePaise: BigInt(200000000), taxPercent: 6.0 },
    { zoneId: madhyaPradesh.id, fuelType: VehicleFuelType.ELECTRIC, minPricePaise: BigInt(0), maxPricePaise: BigInt(500000000), taxPercent: 2.0 },
  ];

  for (const t of taxEntries) {
    await prisma.stateTaxConfig.upsert({
      where: {
        zoneId_fuelType_minPricePaise_maxPricePaise: {
          zoneId: t.zoneId,
          fuelType: t.fuelType,
          minPricePaise: t.minPricePaise,
          maxPricePaise: t.maxPricePaise,
        },
      },
      create: {
        ...t,
        flatFeePaise: BigInt(200000), // ₹2,000 RTO cess/registration
        needsVerification: true,
      },
      update: {},
    });
  }

  // ----------------------------------------------------------------------------
  // 3. SEED AUTOMOTIVE CATALOG (6 Brands, 19 Models, 42 Variants)
  // ----------------------------------------------------------------------------
  console.log('🚗 Seeding Automotive Catalog (6 Brands, 19 Models, 42 Variants)...');

  const brandsData = [
    { name: 'Maruti Suzuki', slug: 'maruti-suzuki', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
    { name: 'Tata Motors', slug: 'tata-motors', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
    { name: 'Hyundai', slug: 'hyundai', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
    { name: 'Mahindra & Mahindra', slug: 'mahindra', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
    { name: 'Kia', slug: 'kia', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
    { name: 'Toyota', slug: 'toyota', logoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120' },
  ];

  const brandMap = new Map<string, string>();
  for (const b of brandsData) {
    const brand = await prisma.brand.upsert({
      where: { slug: b.slug },
      create: b,
      update: {},
    });
    brandMap.set(b.slug, brand.id);
  }

  const catalogStructure = [
    // MARUTI SUZUKI
    {
      brandSlug: 'maruti-suzuki',
      modelName: 'Swift',
      modelSlug: 'swift',
      bodyType: VehicleBodyType.HATCHBACK,
      variants: [
        { name: 'LXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 64900000 },
        { name: 'VXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 72900000 },
        { name: 'ZXi AMT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.AUTOMATIC, cc: 1197, seats: 5, price: 87500000 },
        { name: 'VXi CNG', fuel: VehicleFuelType.CNG, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 81900000 },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      modelName: 'Brezza',
      modelSlug: 'brezza',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        { name: 'LXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 5, price: 83400000 },
        { name: 'VXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 5, price: 96900000 },
        { name: 'ZXi AT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.AUTOMATIC, cc: 1462, seats: 5, price: 125400000 },
      ],
    },
    {
      brandSlug: 'maruti-suzuki',
      modelName: 'Ertiga',
      modelSlug: 'ertiga',
      bodyType: VehicleBodyType.MUV,
      variants: [
        { name: 'VXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 7, price: 97800000 },
        { name: 'ZXi MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 7, price: 108800000 },
        { name: 'VXi CNG', fuel: VehicleFuelType.CNG, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 7, price: 107800000 },
      ],
    },

    // TATA MOTORS
    {
      brandSlug: 'tata-motors',
      modelName: 'Nexon',
      modelSlug: 'nexon',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        { name: 'Smart MT Petrol', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1199, seats: 5, price: 79900000 },
        { name: 'Pure MT Diesel', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1497, seats: 5, price: 109900000 },
        { name: 'Fearless Plus DCA Petrol', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.DCT, cc: 1199, seats: 5, price: 146900000 },
        { name: 'EV Long Range Empowered', fuel: VehicleFuelType.ELECTRIC, trans: VehicleTransmission.AUTOMATIC, cc: null, seats: 5, price: 169900000 },
      ],
    },
    {
      brandSlug: 'tata-motors',
      modelName: 'Punch',
      modelSlug: 'punch',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        { name: 'Pure MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1199, seats: 5, price: 61200000 },
        { name: 'Adventure MT CNG', fuel: VehicleFuelType.CNG, trans: VehicleTransmission.MANUAL, cc: 1199, seats: 5, price: 78900000 },
        { name: 'Accomplished Dazzle AMT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.AUTOMATIC, cc: 1199, seats: 5, price: 87900000 },
      ],
    },
    {
      brandSlug: 'tata-motors',
      modelName: 'Harrier',
      modelSlug: 'harrier',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'Smart MT Diesel', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1956, seats: 5, price: 149900000 },
        { name: 'Fearless Plus AT Dark', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.AUTOMATIC, cc: 1956, seats: 5, price: 258900000 },
      ],
    },

    // HYUNDAI
    {
      brandSlug: 'hyundai',
      modelName: 'Creta',
      modelSlug: 'creta',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'EX 1.5 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1497, seats: 5, price: 121700000 },
        { name: 'S(O) 1.5 Diesel MT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1493, seats: 5, price: 143600000 },
        { name: 'SX(O) 1.5 Turbo DCT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.DCT, cc: 1482, seats: 5, price: 199900000 },
      ],
    },
    {
      brandSlug: 'hyundai',
      modelName: 'Venue',
      modelSlug: 'venue',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        { name: 'E 1.2 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 79400000 },
        { name: 'SX 1.2 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 109900000 },
        { name: 'SX(O) 1.0 Turbo DCT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.DCT, cc: 998, seats: 5, price: 132300000 },
      ],
    },

    // MAHINDRA
    {
      brandSlug: 'mahindra',
      modelName: 'Scorpio-N',
      modelSlug: 'scorpio-n',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'Z2 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1997, seats: 7, price: 136000000 },
        { name: 'Z4 Diesel MT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 2184, seats: 7, price: 152400000 },
        { name: 'Z8L Diesel 4WD AT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.AUTOMATIC, cc: 2184, seats: 7, price: 245400000 },
      ],
    },
    {
      brandSlug: 'mahindra',
      modelName: 'Bolero Neo',
      modelSlug: 'bolero-neo',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'N4 Diesel MT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1493, seats: 7, price: 99000000 },
        { name: 'N10 (O) Diesel MT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1493, seats: 7, price: 121500000 },
      ],
    },
    {
      brandSlug: 'mahindra',
      modelName: 'XUV700',
      modelSlug: 'xuv700',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'AX5 Petrol MT 7-Str', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1997, seats: 7, price: 176900000 },
        { name: 'AX7L Diesel AT AWD', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.AUTOMATIC, cc: 2184, seats: 7, price: 269900000 },
      ],
    },
    {
      brandSlug: 'mahindra',
      modelName: 'Thar',
      modelSlug: 'thar',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'AX Opt Diesel MT 4WD', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 2184, seats: 4, price: 148500000 },
        { name: 'LX Petrol AT 4WD Hard Top', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.AUTOMATIC, cc: 1997, seats: 4, price: 169900000 },
      ],
    },

    // KIA
    {
      brandSlug: 'kia',
      modelName: 'Seltos',
      modelSlug: 'seltos',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'HTE 1.5 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1497, seats: 5, price: 108900000 },
        { name: 'HTX 1.5 Diesel AT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.AUTOMATIC, cc: 1493, seats: 5, price: 182900000 },
        { name: 'GTX Plus 1.5 Turbo DCT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.DCT, cc: 1482, seats: 5, price: 199900000 },
      ],
    },
    {
      brandSlug: 'kia',
      modelName: 'Sonet',
      modelSlug: 'sonet',
      bodyType: VehicleBodyType.COMPACT_SUV,
      variants: [
        { name: 'HTE 1.2 Petrol MT', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1197, seats: 5, price: 79900000 },
        { name: 'HTX 1.5 Diesel iMT', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.MANUAL, cc: 1493, seats: 5, price: 119900000 },
      ],
    },
    {
      brandSlug: 'kia',
      modelName: 'Carens',
      modelSlug: 'carens',
      bodyType: VehicleBodyType.MUV,
      variants: [
        { name: 'Prestige 1.5 Petrol MT 7-Str', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.MANUAL, cc: 1497, seats: 7, price: 119900000 },
        { name: 'Luxury Plus 1.5 Diesel AT 6-Str', fuel: VehicleFuelType.DIESEL, trans: VehicleTransmission.AUTOMATIC, cc: 1493, seats: 6, price: 194500000 },
      ],
    },

    // TOYOTA
    {
      brandSlug: 'toyota',
      modelName: 'Innova Hycross',
      modelSlug: 'innova-hycross',
      bodyType: VehicleBodyType.MUV,
      variants: [
        { name: 'GX 2.0 Petrol CVT 7-Str', fuel: VehicleFuelType.PETROL, trans: VehicleTransmission.CVT, cc: 1987, seats: 7, price: 197700000 },
        { name: 'VX Hybrid 2.0 e-CVT 7-Str', fuel: VehicleFuelType.HYBRID, trans: VehicleTransmission.CVT, cc: 1987, seats: 7, price: 259700000 },
        { name: 'ZX(O) Hybrid 2.0 e-CVT 7-Str', fuel: VehicleFuelType.HYBRID, trans: VehicleTransmission.CVT, cc: 1987, seats: 7, price: 309800000 },
      ],
    },
    {
      brandSlug: 'toyota',
      modelName: 'Urban Cruiser Hyryder',
      modelSlug: 'urban-cruiser-hyryder',
      bodyType: VehicleBodyType.SUV,
      variants: [
        { name: 'E 1.5 NeoDrive MT', fuel: VehicleFuelType.HYBRID, trans: VehicleTransmission.MANUAL, cc: 1462, seats: 5, price: 111400000 },
        { name: 'G 1.5 Hybrid e-CVT', fuel: VehicleFuelType.HYBRID, trans: VehicleTransmission.CVT, cc: 1490, seats: 5, price: 186900000 },
      ],
    },
  ];

  let totalVariantsCreated = 0;
  let targetScorpioVariantId = '';
  let targetBrezzaVariantId = '';

  for (const item of catalogStructure) {
    const brandId = brandMap.get(item.brandSlug)!;
    const model = await prisma.carModel.upsert({
      where: { brandId_slug: { brandId, slug: item.modelSlug } },
      create: {
        brandId,
        name: item.modelName,
        slug: item.modelSlug,
        bodyType: item.bodyType,
      },
      update: {},
    });

    for (const v of item.variants) {
      const variant = await prisma.variant.upsert({
        where: {
          carModelId_name_fuelType_transmission: {
            carModelId: model.id,
            name: v.name,
            fuelType: v.fuel,
            transmission: v.trans,
          },
        },
        create: {
          carModelId: model.id,
          name: v.name,
          fuelType: v.fuel,
          transmission: v.trans,
          engineCc: v.cc,
          seatingCapacity: v.seats,
          baseExShowroomPaise: BigInt(v.price),
          imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800',
        },
        update: {},
      });

      totalVariantsCreated++;
      if (item.modelName === 'Scorpio-N' && v.name === 'Z4 Diesel MT') {
        targetScorpioVariantId = variant.id;
      }
      if (item.modelName === 'Brezza' && v.name === 'VXi MT') {
        targetBrezzaVariantId = variant.id;
      }
    }
  }

  console.log(`✅ Seeded ${totalVariantsCreated} variants across 19 car models!`);

  // ----------------------------------------------------------------------------
  // 4. SEED 10 DUMMY VERIFIED DEALERS (Sellers)
  // ----------------------------------------------------------------------------
  console.log('🏢 Seeding 10 Verified Multi-Brand Dealerships...');

  const dealersData = [
    {
      legalName: 'Kalyani Automotive Private Limited',
      tradeName: 'Kalyani Motors Pune',
      email: 'dealer.kalyani@groupdrive.in',
      phone: '+919822000001',
      gstin: '27AABCK1234F1Z5',
      pan: 'AABCK1234F',
      brandSlugs: ['maruti-suzuki'],
      branchName: 'Kalyani Baramati Dealership',
      branchZone: baramatiTaluka,
      address: 'Plot 42, MIDC Industrial Area, Baramati',
      pincode: '413102',
    },
    {
      legalName: 'Seva Automotive Pvt Ltd',
      tradeName: 'Seva Motors Satara',
      email: 'dealer.seva@groupdrive.in',
      phone: '+919822000002',
      gstin: '27AABCS5678G1Z2',
      pan: 'AABCS5678G',
      brandSlugs: ['maruti-suzuki'],
      branchName: 'Seva Phaltan Sales & Service',
      branchZone: phaltanTaluka,
      address: 'Survey 112, Pune-Pandharpur Road, Phaltan',
      pincode: '415523',
    },
    {
      legalName: 'Sahyadri Auto Sales & Services',
      tradeName: 'Sahyadri Tata Pune-Baramati',
      email: 'dealer.sahyadri@groupdrive.in',
      phone: '+919822000003',
      gstin: '27AABCS9012H1Z9',
      pan: 'AABCS9012H',
      brandSlugs: ['tata-motors'],
      branchName: 'Sahyadri Baramati Showroom',
      branchZone: baramatiTaluka,
      address: 'Near Agriculture College, Baramati',
      pincode: '413102',
    },
    {
      legalName: 'Silver Star Motors LLP',
      tradeName: 'Silver Mahindra Pune Rural',
      email: 'dealer.silver@groupdrive.in',
      phone: '+919822000004',
      gstin: '27AABCS3456J1Z6',
      pan: 'AABCS3456J',
      brandSlugs: ['mahindra'],
      branchName: 'Silver Mahindra Baramati Hub',
      branchZone: baramatiTaluka,
      address: 'Indapur Road, Opposite Market Yard, Baramati',
      pincode: '413102',
    },
    {
      legalName: 'Panchjanya Commercials & Cars',
      tradeName: 'Panchjanya Mahindra Satara',
      email: 'dealer.panchjanya@groupdrive.in',
      phone: '+919822000005',
      gstin: '27AABCP7890K1Z3',
      pan: 'AABCP7890K',
      brandSlugs: ['mahindra'],
      branchName: 'Panchjanya Karad Branch',
      branchZone: karadTaluka,
      address: 'NH4 Highway Touch, Karad',
      pincode: '415110',
    },
    {
      legalName: 'Kundan Cars Private Limited',
      tradeName: 'Kundan Hyundai Western MH',
      email: 'dealer.kundan@groupdrive.in',
      phone: '+919822000006',
      gstin: '27AABCK2345L1Z0',
      pan: 'AABCK2345L',
      brandSlugs: ['hyundai'],
      branchName: 'Kundan Shirur Facility',
      branchZone: shirurTaluka,
      address: 'Pune-Nagar Road, Shirur',
      pincode: '412210',
    },
    {
      legalName: 'Shanti Motors & Mobility MP',
      tradeName: 'Shanti Mahindra Indore-Dhar',
      email: 'dealer.shanti@groupdrive.in',
      phone: '+919823000001',
      gstin: '23AABCS6789M1Z7',
      pan: 'AABCS6789M',
      brandSlugs: ['mahindra'],
      branchName: 'Shanti Depalpur Satellite Showroom',
      branchZone: depalpurTaluka,
      address: 'Main Indore Road, Depalpur',
      pincode: '453115',
    },
    {
      legalName: 'Malwa Auto Corp Pvt Ltd',
      tradeName: 'Malwa Maruti Depalpur',
      email: 'dealer.malwa@groupdrive.in',
      phone: '+919823000002',
      gstin: '23AABCM0123N1Z4',
      pan: 'AABCM0123N',
      brandSlugs: ['maruti-suzuki'],
      branchName: 'Malwa Depalpur Rural Hub',
      branchZone: depalpurTaluka,
      address: 'Betma-Depalpur Junction, Indore Rural',
      pincode: '453115',
    },
    {
      legalName: 'Nimar Toyota Mobility',
      tradeName: 'Nimar Toyota Indore South',
      email: 'dealer.nimar@groupdrive.in',
      phone: '+919823000003',
      gstin: '23AABCN4567P1Z1',
      pan: 'AABCN4567P',
      brandSlugs: ['toyota'],
      branchName: 'Nimar AB Road Regional Outlet',
      branchZone: sanwerTaluka,
      address: 'Sanwer Industrial Belt, Indore',
      pincode: '453551',
    },
    {
      legalName: 'Dhar Progressive Motors LLP',
      tradeName: 'Progressive Tata Dhar',
      email: 'dealer.dhar@groupdrive.in',
      phone: '+919823000004',
      gstin: '23AABCD8901Q1Z8',
      pan: 'AABCD8901Q',
      brandSlugs: ['tata-motors', 'kia'],
      branchName: 'Progressive Badnawar Centre',
      branchZone: badnawarTaluka,
      address: 'Ujjain-Dhar State Highway, Badnawar',
      pincode: '454660',
    },
  ];

  const seededDealerProfiles: { id: string; branchId: string; legalName: string }[] = [];

  for (const d of dealersData) {
    const user = await prisma.user.upsert({
      where: { phone: d.phone },
      create: {
        email: d.email,
        phone: d.phone,
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXw3..U7J4kP2wY6L7aX0b4h5bK3b/V8n2W2K', // TestPassword@123
        role: UserRole.SELLER,
        isActive: true,
      },
      update: {},
    });

    const sellerProfile = await prisma.sellerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        dealershipLegalName: d.legalName,
        tradeName: d.tradeName,
        gstin: d.gstin,
        panNumber: d.pan,
        kycStatus: SellerKycStatus.VERIFIED,
        registrationFeeStatus: SellerRegistrationFeeStatus.PAID,
        commissionRatePercent: 1.0,
        primaryContactName: 'Rajesh Patil',
        primaryContactPhone: d.phone,
      },
      update: {},
    });

    // Check existing branch or create
    let branch = await prisma.sellerBranch.findFirst({
      where: { sellerProfileId: sellerProfile.id, branchName: d.branchName },
    });
    if (!branch) {
      branch = await prisma.sellerBranch.create({
        data: {
          sellerProfileId: sellerProfile.id,
          branchName: d.branchName,
          zoneId: d.branchZone.id,
          address: d.address,
          pincode: d.pincode,
          latitude: d.branchZone.latitude ?? 18.5,
          longitude: d.branchZone.longitude ?? 74.0,
          contactPhone: d.phone,
          isHeadquarters: true,
        },
      });
    }

    seededDealerProfiles.push({ id: sellerProfile.id, branchId: branch.id, legalName: d.legalName });

    // Brand Authorizations
    for (const bSlug of d.brandSlugs) {
      const bId = brandMap.get(bSlug);
      if (bId) {
        await prisma.sellerBrandAuthorization.upsert({
          where: { sellerProfileId_brandId: { sellerProfileId: sellerProfile.id, brandId: bId } },
          create: {
            sellerProfileId: sellerProfile.id,
            brandId: bId,
            certificateUrl: 'https://storage.groupdrive.in/kyc/oem-auth-cert.pdf',
            validFrom: new Date('2024-01-01'),
            validUntil: new Date('2028-12-31'),
            isVerified: true,
          },
          update: {},
        });
      }
    }

    // KYC Documents (GST)
    const existingKyc = await prisma.sellerKyc.findFirst({
      where: { sellerProfileId: sellerProfile.id, documentType: KycDocumentType.GST_CERTIFICATE },
    });
    if (!existingKyc) {
      await prisma.sellerKyc.create({
        data: {
          sellerProfileId: sellerProfile.id,
          documentType: KycDocumentType.GST_CERTIFICATE,
          documentUrl: 'https://storage.groupdrive.in/kyc/gst-certificate.pdf',
          verificationStatus: KycVerificationStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      });
    }

    // Registration Payment
    const existingPayment = await prisma.sellerRegistrationPayment.findFirst({
      where: { sellerProfileId: sellerProfile.id },
    });
    if (!existingPayment) {
      await prisma.sellerRegistrationPayment.create({
        data: {
          sellerProfileId: sellerProfile.id,
          amountPaise: BigInt(1999900), // ₹19,999
          gstAmountPaise: BigInt(359982), // ₹3,599.82 (18% GST)
          totalAmountPaise: BigInt(2359882), // ₹23,598.82
          status: PaymentStatus.CAPTURED,
          gatewayProvider: PaymentGatewayProvider.MOCK,
          gatewayPaymentRef: `pay_mock_reg_${d.pan.toLowerCase()}`,
          paidAt: new Date(),
        },
      });
    }
  }

  // ----------------------------------------------------------------------------
  // 5. SEED 30 DUMMY BUYERS (Across Rural Maharashtra & MP)
  // ----------------------------------------------------------------------------
  console.log('👥 Seeding 30 Rural & Semi-Urban Buyers...');

  const buyerNames = [
    { name: 'Sanjay Tukaram Jagtap', zone: baramatiTaluka, pin: '413102', village: 'Baramati Rural' },
    { name: 'Amol Dattatray Shinde', zone: baramatiTaluka, pin: '413115', village: 'Malegaon Bk' },
    { name: 'Pravin Ramdas More', zone: baramatiTaluka, pin: '413102', village: 'Khandala Road' },
    { name: 'Ganesh Babanrao Gaikwad', zone: baramatiTaluka, pin: '413102', village: 'Baramati MIDC' },
    { name: 'Nitin Anandrao Pawar', zone: baramatiTaluka, pin: '413115', village: 'Malegaon Tal' },
    { name: 'Dnyaneshwar Sopan Kadam', zone: phaltanTaluka, pin: '415523', village: 'Phaltan Rural' },
    { name: 'Vijay Vasantrao Salunkhe', zone: karadTaluka, pin: '415110', village: 'Karad East' },
    { name: 'Mahesh Pandurang Jadhav', zone: karadTaluka, pin: '415110', village: 'Karad MIDC' },
    { name: 'Sachin Madhavrao Ghorpade', zone: phaltanTaluka, pin: '415523', village: 'Lonand Road' },
    { name: 'Sunil Balasaheb Thorat', zone: sangamnerTaluka, pin: '422605', village: 'Sangamner Rural' },
    { name: 'Vikas Prabhakar Deshmukh', zone: shrirampurTaluka, pin: '413709', village: 'Shrirampur Town' },
    { name: 'Rameshwar Kisanrao Kale', zone: junnarTaluka, pin: '410502', village: 'Alephata' },
    { name: 'Deepak Baburao Wagh', zone: junnarTaluka, pin: '410502', village: 'Otur' },
    { name: 'Rahul Subhash Patil', zone: shirurTaluka, pin: '412210', village: 'Shikrapur' },
    { name: 'Ashok Shankar Tambe', zone: shirurTaluka, pin: '412210', village: 'Ranjangaon' },
    // MP Buyers
    { name: 'Radheshyam Patidar', zone: depalpurTaluka, pin: '453115', village: 'Depalpur Kasba' },
    { name: 'Mukesh Choudhary', zone: depalpurTaluka, pin: '453115', village: 'Betma Village' },
    { name: 'Kamal Kishore Sharma', zone: depalpurTaluka, pin: '453115', village: 'Gautampura' },
    { name: 'Dharmendra Singh Rajput', zone: sanwerTaluka, pin: '453551', village: 'Sanwer Rural' },
    { name: 'Gopal Krishna Verma', zone: sanwerTaluka, pin: '453551', village: 'Dharmapuri Sanwer' },
    { name: 'Babulal Solanki', zone: badnawarTaluka, pin: '454660', village: 'Badnawar Kasba' },
    { name: 'Jagdish Mukati', zone: badnawarTaluka, pin: '454660', village: 'Kachhi Baroda' },
    { name: 'Narayan Singh Tomar', zone: badnawarTaluka, pin: '454660', village: 'Bakhatgarh' },
    { name: 'Hemant Joshi', zone: kukshiTaluka, pin: '454331', village: 'Kukshi Main' },
    { name: 'Suresh Chandra Mandloi', zone: kukshiTaluka, pin: '454331', village: 'Dahi Village' },
    { name: 'Rakesh Malviya', zone: haveliTaluka, pin: '411028', village: 'Hadapsar Rural' },
    { name: 'Anil Tanaji Bhosale', zone: haveliTaluka, pin: '412207', village: 'Wagholi' },
    { name: 'Bhagwan Vitthal Gite', zone: junnarTaluka, pin: '412409', village: 'Narayangaon' },
    { name: 'Santosh Haribhau Shinde', zone: baramatiTaluka, pin: '413102', village: 'Supa' },
    { name: 'Kailas Kashinath Jagdale', zone: phaltanTaluka, pin: '415523', village: 'Taradgaon' },
  ];

  const seededBuyerProfileIds: string[] = [];

  for (let i = 0; i < buyerNames.length; i++) {
    const b = buyerNames[i];
    const phone = `+9197000000${String(i + 1).padStart(2, '0')}`;
    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        email: `buyer.${i + 1}@groupdrive.in`,
        role: UserRole.BUYER,
        isActive: true,
      },
      update: {},
    });

    const buyerProfile = await prisma.buyerProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        fullName: b.name,
        primaryZoneId: b.zone.id,
        pincode: b.pin,
        address: `${b.village}, Post ${b.zone.name}, Dist. Zone ${b.pin}`,
      },
      update: {},
    });

    seededBuyerProfileIds.push(buyerProfile.id);
  }

  console.log(`✅ Seeded ${seededBuyerProfileIds.length} buyer profiles.`);

  // ----------------------------------------------------------------------------
  // 6. SEED DEMO GROUPS, RFQS, QUOTES, AND APPEND-ONLY LEDGER
  // ----------------------------------------------------------------------------
  console.log('🤝 Seeding Active Group, RFQ, Sealed Quotes & Ledger Audit...');

  // Group 1: Baramati Rural Group for Mahindra Scorpio-N Z4 Diesel
  let group1 = await prisma.group.findFirst({
    where: { variantId: targetScorpioVariantId, targetZoneId: baramatiTaluka.id },
  });

  if (!group1) {
    group1 = await prisma.group.create({
      data: {
        variantId: targetScorpioVariantId,
        targetZoneId: baramatiTaluka.id,
        targetCount: 5,
        currentCount: 5,
        status: GroupStatus.DEAL_LOCKED,
        deadline: new Date(Date.now() + 86400000 * 7),
        quorumReachedAt: new Date(Date.now() - 86400000 * 3),
        dealLockedAt: new Date(Date.now() - 86400000 * 1),
      },
    });

    // Attach 5 buyers to Group 1
    const memberships = [];
    for (let i = 0; i < 5; i++) {
      const m = await prisma.membership.create({
        data: {
          groupId: group1.id,
          buyerProfileId: seededBuyerProfileIds[i],
          tokenPaidPaise: BigInt(500000), // ₹5,000 commitment token
          status: MembershipStatus.ACTIVE,
        },
      });
      memberships.push(m);

      // Append to Ledger (Buyer Token Deposit)
      await prisma.ledgerEntry.create({
        data: {
          accountType: LedgerAccountType.BUYER_ESCROW_HOLD,
          actorId: seededBuyerProfileIds[i],
          debitPaise: BigInt(500000),
          creditPaise: BigInt(0),
          balanceAfterPaise: BigInt(500000 * (i + 1)),
          narration: `Token advance paid by ${buyerNames[i].name} for Scorpio-N Baramati Group`,
        },
      });
    }

    // RFQ for Group 1
    const rfq1 = await prisma.rFQ.create({
      data: {
        groupId: group1.id,
        rfqNumber: 'RFQ-MH-PUN-BAR-0001',
        status: RfqStatus.VOTING_OPEN,
        bidWindowClosesAt: new Date(Date.now() - 86400000),
        votingClosesAt: new Date(Date.now() + 86400000 * 2),
      },
    });

    // Quotes from 2 Mahindra Dealers
    const silverDealer = seededDealerProfiles.find((d) => d.legalName.includes('Silver'))!;
    const panchjanyaDealer = seededDealerProfiles.find((d) => d.legalName.includes('Panchjanya'))!;

    // Quote 1 landed cost calculation:
    // 15,24,000 - 65,000 + 12,000 + 1,98,120 + 55,000 + 2,500 + 15,240 = 17,41,860
    const quote1 = await prisma.quote.create({
      data: {
        rfqId: rfq1.id,
        sellerProfileId: silverDealer.id,
        branchId: silverDealer.branchId,
        status: QuoteStatus.NORMALIZED,
        exShowroomPaise: BigInt(152400000), // ₹15,24,000
        batchGroupDiscountPaise: BigInt(6500000), // ₹65,000 group discount!
        dealerLogisticsToZonePaise: BigInt(1200000), // ₹12,000 transport to Baramati
        roadTaxRtoPaise: BigInt(19812000), // ~13% MH RTO
        insuranceEstimatePaise: BigInt(5500000), // ₹55,000 comprehensive
        fastagRegistrationCessPaise: BigInt(250000), // ₹2,500
        tcsPaise: BigInt(1524000), // 1% TCS above 10L
        totalLandedCostPaise: BigInt(174186000), // ₹17,41,860 landed
        deliveryTimelineDays: 14,
        validityDate: new Date(Date.now() + 86400000 * 14),
        notes: 'Express delivery from Baramati Stockyard with complimentary mudflaps & mats.',
      },
    });

    // Quote 2 landed cost calculation:
    // 15,24,000 - 50,000 + 18,000 + 1,98,120 + 58,000 + 2,500 + 15,240 = 17,65,860
    await prisma.quote.create({
      data: {
        rfqId: rfq1.id,
        sellerProfileId: panchjanyaDealer.id,
        branchId: panchjanyaDealer.branchId,
        status: QuoteStatus.NORMALIZED,
        exShowroomPaise: BigInt(152400000),
        batchGroupDiscountPaise: BigInt(5000000), // ₹50,000 group discount
        dealerLogisticsToZonePaise: BigInt(1800000), // ₹18,000 transit from Karad
        roadTaxRtoPaise: BigInt(19812000),
        insuranceEstimatePaise: BigInt(5800000),
        fastagRegistrationCessPaise: BigInt(250000),
        tcsPaise: BigInt(1524000),
        totalLandedCostPaise: BigInt(176586000),
        deliveryTimelineDays: 20,
        validityDate: new Date(Date.now() + 86400000 * 14),
        notes: 'Stock ready at Karad main facility.',
      },
    });

    // Buyer Votes for Quote 1 (Lowest Landed Cost in Baramati)
    for (let i = 0; i < 4; i++) {
      await prisma.vote.create({
        data: {
          rfqId: rfq1.id,
          membershipId: memberships[i].id,
          buyerProfileId: seededBuyerProfileIds[i],
          quoteId: quote1.id,
        },
      });
    }
  }

  // Group 2: Forming Brezza group in Depalpur, MP
  let group2 = await prisma.group.findFirst({
    where: { variantId: targetBrezzaVariantId, targetZoneId: depalpurTaluka.id },
  });

  if (!group2) {
    group2 = await prisma.group.create({
      data: {
        variantId: targetBrezzaVariantId,
        targetZoneId: depalpurTaluka.id,
        targetCount: 5,
        currentCount: 3,
        status: GroupStatus.FORMING,
        deadline: new Date(Date.now() + 86400000 * 10),
      },
    });

    for (let i = 15; i < 18; i++) {
      await prisma.membership.create({
        data: {
          groupId: group2.id,
          buyerProfileId: seededBuyerProfileIds[i],
          tokenPaidPaise: BigInt(500000),
          status: MembershipStatus.ACTIVE,
        },
      });
    }
  }

  console.log('🎉 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
