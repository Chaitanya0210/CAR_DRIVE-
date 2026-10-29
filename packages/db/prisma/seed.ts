import { PrismaClient, VehicleFuelType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GroupDrive database with Indian administrative zones, tax rates, and vehicle catalog...');

  // 1. Seed State: Maharashtra
  const maharashtra = await prisma.state.upsert({
    where: { code: 'MH' },
    update: {},
    create: {
      code: 'MH',
      name: 'Maharashtra',
      gstStateCode: 27,
    },
  });

  // 2. Seed District: Pune & Satara
  const pune = await prisma.district.upsert({
    where: {
      stateId_code: {
        stateId: maharashtra.id,
        code: 'PUN',
      },
    },
    update: {},
    create: {
      stateId: maharashtra.id,
      code: 'PUN',
      name: 'Pune',
    },
  });

  // 3. Seed Talukas in Pune
  const baramati = await prisma.taluka.upsert({
    where: {
      districtId_name: {
        districtId: pune.id,
        name: 'Baramati',
      },
    },
    update: {},
    create: {
      districtId: pune.id,
      name: 'Baramati',
      isRural: true,
    },
  });

  const haveli = await prisma.taluka.upsert({
    where: {
      districtId_name: {
        districtId: pune.id,
        name: 'Haveli',
      },
    },
    update: {},
    create: {
      districtId: pune.id,
      name: 'Haveli',
      isRural: false,
    },
  });

  // 4. Seed Pincodes
  await prisma.pincodeDirectory.upsert({
    where: { pincode: '413102' },
    update: {},
    create: {
      pincode: '413102',
      talukaId: baramati.id,
      latitude: 18.1519,
      longitude: 74.577,
    },
  });

  await prisma.pincodeDirectory.upsert({
    where: { pincode: '411028' },
    update: {},
    create: {
      pincode: '411028',
      talukaId: haveli.id,
      latitude: 18.4967,
      longitude: 73.9312,
    },
  });

  // 5. Seed Car Catalog (Maruti, Tata)
  const maruti = await prisma.carMake.upsert({
    where: { name: 'Maruti Suzuki' },
    update: {},
    create: {
      name: 'Maruti Suzuki',
      logoUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=120&q=80',
    },
  });

  const swift = await prisma.carModel.upsert({
    where: {
      makeId_name: {
        makeId: maruti.id,
        name: 'Swift',
      },
    },
    update: {},
    create: {
      makeId: maruti.id,
      name: 'Swift',
    },
  });

  await prisma.carVariant.upsert({
    where: {
      modelId_name_fuelType: {
        modelId: swift.id,
        name: 'ZXi AMT',
        fuelType: VehicleFuelType.PETROL,
      },
    },
    update: {},
    create: {
      modelId: swift.id,
      name: 'ZXi AMT',
      fuelType: VehicleFuelType.PETROL,
      transmission: 'AMT',
      engineCc: 1197,
      standardExShowroomPaise: BigInt(87500000), // ₹8,75,000
      imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
    },
  });

  // 6. Seed Regulatory Tax Rules (Marked needsVerification: true)
  await prisma.taxRuleConfig.upsert({
    where: { ruleKey: 'GST_AUTOMOTIVE_BASE' },
    update: {},
    create: {
      ruleKey: 'GST_AUTOMOTIVE_BASE',
      description: 'Standard 28% GST on Passenger Vehicles',
      ratePercent: 28.0,
      needsVerification: true,
    },
  });

  await prisma.taxRuleConfig.upsert({
    where: { ruleKey: 'TCS_ABOVE_10L' },
    update: {},
    create: {
      ruleKey: 'TCS_ABOVE_10L',
      description: '1% Tax Collected at Source on Vehicle Sale > 10 Lakhs INR',
      ratePercent: 1.0,
      needsVerification: true,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
