export interface PlatformGroup {
  id: string;
  brand: string;
  model: string;
  variant: string;
  zoneId: string;
  zoneName: string;
  district: string;
  state: string;
  targetSize: number;
  currentSize: number;
  status:
    | 'DRAFT'
    | 'OPEN'
    | 'THRESHOLD_MET'
    | 'RFQ_OPEN'
    | 'QUOTES_CLOSED'
    | 'VOTING'
    | 'WINNER_SELECTED'
    | 'BOOKING'
    | 'COMPLETED';
  deadlineDate: string;
  createdAt: string;
  members: Array<{
    userId: string;
    variant: string;
    color: string;
    joinedAt: string;
  }>;
}

export interface PlatformRfq {
  id: string;
  groupId: string;
  brand: string;
  model: string;
  zoneId: string;
  district: string;
  state: string;
  quantity: number;
  status: 'OPEN' | 'CLOSED' | 'AWARDED';
  biddingDeadline: string;
  biddingClosesInHours: number;
}

export interface PlatformQuote {
  id: string;
  rfqId: string;
  dealerId: string;
  dealershipName: string;
  exShowroomDiscountPaise: number;
  logisticsCostPaise: number;
  freeAccessories: string[];
  deliveryTimelineDays: number;
  validityHours: number;
  submittedAt: string;
  status: 'SEALED' | 'UNMASKED' | 'WINNER' | 'REJECTED';
}

export interface PlatformListing {
  id: string;
  dealerId: string;
  dealershipName: string;
  brand: string;
  model: string;
  variant: string;
  category: 'STOCK_CLEARANCE' | 'DEMO_TEST_DRIVE' | 'PREVIOUS_YEAR' | 'FESTIVAL_OFFER';
  manufacturingYear: number;
  odometerKm?: number;
  color: string;
  fuel: 'PETROL' | 'DIESEL' | 'CNG' | 'EV';
  transmission: 'MANUAL' | 'AUTOMATIC';
  originalPricePaise: number;
  offerPricePaise: number;
  discountPercent: number;
  unitsAvailable: number;
  locationZoneId: string;
  locationCity: string;
  state: string;
  warrantyTerms: string;
  status: 'ACTIVE' | 'SOLD' | 'PENDING_MODERATION';
  dealScore: number;
  canFormGroup: boolean;
}

export interface PlatformBooking {
  id: string;
  userId: string;
  groupId: string;
  quoteId: string;
  variant: string;
  bookingAmountPaise: number;
  paymentState: 'INITIATED' | 'HELD_PENDING_DELIVERY' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  shipmentMilestones: Array<{
    code: 'ORDER_PLACED' | 'DISPATCHED' | 'IN_TRANSIT' | 'ARRIVED_AT_HUB' | 'DELIVERED';
    title: string;
    completedAt?: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  }>;
  odometerKmAtPdi: number;
  documentChecklist: Array<{ name: string; verified: boolean }>;
  disputeId?: string;
}

export interface PlatformDispute {
  id: string;
  bookingId: string;
  dealerId: string;
  buyerId: string;
  reason: 'TRANSIT_DELAY' | 'ODOMETER_OVER_100KM' | 'WRONG_ACCESSORIES' | 'PRICE_DISCREPANCY';
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED_REFUND' | 'RESOLVED_REPLACEMENT';
  filedAt: string;
}

export class PlatformStore {
  public groups: Map<string, PlatformGroup> = new Map();
  public rfqs: Map<string, PlatformRfq> = new Map();
  public quotes: Map<string, PlatformQuote> = new Map();
  public listings: Map<string, PlatformListing> = new Map();
  public bookings: Map<string, PlatformBooking> = new Map();
  public disputes: Map<string, PlatformDispute> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData(): void {
    this.groups.clear();
    this.rfqs.clear();
    this.quotes.clear();
    this.listings.clear();
    this.bookings.clear();
    this.disputes.clear();

    // 1. Groups
    const scorpioGroup: PlatformGroup = {
      id: 'grp-baramati-scorpio-01',
      brand: 'Mahindra',
      model: 'Scorpio-N',
      variant: 'Z4 Diesel 4WD MT',
      zoneId: 'zone-baramati',
      zoneName: 'Baramati Taluka',
      district: 'Pune',
      state: 'Maharashtra',
      targetSize: 5,
      currentSize: 4,
      status: 'OPEN',
      deadlineDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      members: [
        {
          userId: 'buyer-01',
          variant: 'Z4 Diesel 4WD MT',
          color: 'Deep Forest',
          joinedAt: '2026-10-27T10:00:00Z',
        },
        {
          userId: 'buyer-02',
          variant: 'Z4 Diesel 4WD MT',
          color: 'Everest White',
          joinedAt: '2026-10-28T11:00:00Z',
        },
        {
          userId: 'buyer-03',
          variant: 'Z4 Diesel 4WD MT',
          color: 'Dazzling Silver',
          joinedAt: '2026-10-29T14:00:00Z',
        },
        {
          userId: 'buyer-04',
          variant: 'Z6 Diesel 2WD AT',
          color: 'Napoli Black',
          joinedAt: '2026-10-30T09:00:00Z',
        },
      ],
    };

    const nexonGroup: PlatformGroup = {
      id: 'grp-satara-nexon-02',
      brand: 'Tata',
      model: 'Nexon',
      variant: 'Creative Diesel MT',
      zoneId: 'zone-satara',
      zoneName: 'Satara Rural Zone',
      district: 'Satara',
      state: 'Maharashtra',
      targetSize: 3,
      currentSize: 3,
      status: 'QUOTES_CLOSED',
      deadlineDate: new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
      members: [
        {
          userId: 'buyer-11',
          variant: 'Creative Diesel MT',
          color: 'Fearless Purple',
          joinedAt: '2026-10-25T10:00:00Z',
        },
        {
          userId: 'buyer-12',
          variant: 'Creative Diesel MT',
          color: 'Pure Grey',
          joinedAt: '2026-10-26T12:00:00Z',
        },
        {
          userId: 'buyer-13',
          variant: 'Pure Diesel MT',
          color: 'Pristine White',
          joinedAt: '2026-10-27T15:00:00Z',
        },
      ],
    };

    const brezzaGroup: PlatformGroup = {
      id: 'grp-haveli-brezza-03',
      brand: 'Maruti Suzuki',
      model: 'Brezza',
      variant: 'ZXi S-CNG',
      zoneId: 'zone-haveli',
      zoneName: 'Haveli Semi-Urban',
      district: 'Pune',
      state: 'Maharashtra',
      targetSize: 4,
      currentSize: 2,
      status: 'OPEN',
      deadlineDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
      members: [
        {
          userId: 'buyer-21',
          variant: 'ZXi S-CNG',
          color: 'Magma Grey',
          joinedAt: '2026-10-29T10:00:00Z',
        },
        {
          userId: 'buyer-22',
          variant: 'VXi S-CNG',
          color: 'Pearl Arctic White',
          joinedAt: '2026-10-30T10:00:00Z',
        },
      ],
    };

    this.groups.set(scorpioGroup.id, scorpioGroup);
    this.groups.set(nexonGroup.id, nexonGroup);
    this.groups.set(brezzaGroup.id, brezzaGroup);

    // 2. RFQs
    const rfqNexon: PlatformRfq = {
      id: 'rfq-satara-nexon-99',
      groupId: 'grp-satara-nexon-02',
      brand: 'Tata',
      model: 'Nexon',
      zoneId: 'zone-satara',
      district: 'Satara',
      state: 'Maharashtra',
      quantity: 3,
      status: 'OPEN',
      biddingDeadline: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
      biddingClosesInHours: 18,
    };

    const rfqScorpio: PlatformRfq = {
      id: 'rfq-baramati-scorpio-88',
      groupId: 'grp-baramati-scorpio-01',
      brand: 'Mahindra',
      model: 'Scorpio-N',
      zoneId: 'zone-baramati',
      district: 'Pune',
      state: 'Maharashtra',
      quantity: 5,
      status: 'OPEN',
      biddingDeadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      biddingClosesInHours: 36,
    };

    this.rfqs.set(rfqNexon.id, rfqNexon);
    this.rfqs.set(rfqScorpio.id, rfqScorpio);

    // 3. Quotes (for Nexon group in QUOTES_CLOSED state)
    const quote1: PlatformQuote = {
      id: 'qt-tata-pune-01',
      rfqId: 'rfq-satara-nexon-99',
      dealerId: 'dealer-pune-tata',
      dealershipName: 'Pune Auto Hub Tata Motors',
      exShowroomDiscountPaise: 9200000, // ₹92,000 discount per unit
      logisticsCostPaise: 650000, // ₹6,500 logistics flatbed to Satara
      freeAccessories: ['7D Floor Mats', 'Mud Flaps', 'Rear Bumper Guard'],
      deliveryTimelineDays: 14,
      validityHours: 48,
      submittedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      status: 'UNMASKED',
    };

    const quote2: PlatformQuote = {
      id: 'qt-tata-kolhapur-02',
      rfqId: 'rfq-satara-nexon-99',
      dealerId: 'dealer-kolhapur-tata',
      dealershipName: 'Kolhapur Motors Tata Dealership',
      exShowroomDiscountPaise: 8400000, // ₹84,000 discount per unit
      logisticsCostPaise: 400000, // ₹4,000 logistics
      freeAccessories: ['Basic Matting', 'Car Cover'],
      deliveryTimelineDays: 10,
      validityHours: 48,
      submittedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      status: 'UNMASKED',
    };

    this.quotes.set(quote1.id, quote1);
    this.quotes.set(quote2.id, quote2);

    // 4. Offered Vehicles / Stock Clearance Listings
    const listing1: PlatformListing = {
      id: 'list-nexon-demo-01',
      dealerId: 'dealer-pune-tata',
      dealershipName: 'Pune Auto Hub Tata Motors',
      brand: 'Tata',
      model: 'Nexon',
      variant: 'Fearless Plus S Diesel MT',
      category: 'DEMO_TEST_DRIVE',
      manufacturingYear: 2025,
      odometerKm: 4200,
      color: 'Flame Red',
      fuel: 'DIESEL',
      transmission: 'MANUAL',
      originalPricePaise: 142000000, // ₹14.2L
      offerPricePaise: 118000000, // ₹11.8L
      discountPercent: 16.9,
      unitsAvailable: 1,
      locationZoneId: 'zone-pune',
      locationCity: 'Pune City',
      state: 'Maharashtra',
      warrantyTerms: '3 Years Comprehensive OEM Manufacturer Warranty',
      status: 'ACTIVE',
      dealScore: 92,
      canFormGroup: false,
    };

    const listing2: PlatformListing = {
      id: 'list-brezza-clearance-02',
      dealerId: 'dealer-baramati-maruti',
      dealershipName: 'Baramati Nexa & Arena Central',
      brand: 'Maruti Suzuki',
      model: 'Brezza',
      variant: 'ZXi S-CNG',
      category: 'STOCK_CLEARANCE',
      manufacturingYear: 2025,
      odometerKm: 25,
      color: 'Brave Khaki',
      fuel: 'CNG',
      transmission: 'MANUAL',
      originalPricePaise: 121000000, // ₹12.1L
      offerPricePaise: 111500000, // ₹11.15L
      discountPercent: 7.85,
      unitsAvailable: 3,
      locationZoneId: 'zone-baramati',
      locationCity: 'Baramati',
      state: 'Maharashtra',
      warrantyTerms: '2 Years Extended OEM Warranty + 1 Year Roadside Assistance',
      status: 'ACTIVE',
      dealScore: 88,
      canFormGroup: true,
    };

    this.listings.set(listing1.id, listing1);
    this.listings.set(listing2.id, listing2);

    // 5. Booking & Track Shipment
    const booking1: PlatformBooking = {
      id: 'bkg-demo-101',
      userId: 'buyer-demo-01',
      groupId: 'grp-baramati-scorpio-01',
      quoteId: 'qt-scorpio-winner-01',
      variant: 'Z4 Diesel 4WD MT',
      bookingAmountPaise: 2500000, // ₹25,000 deposit
      paymentState: 'HELD_PENDING_DELIVERY',
      shipmentMilestones: [
        {
          code: 'ORDER_PLACED',
          title: 'Batch Booking Confirmed',
          completedAt: '2026-10-25T10:00:00Z',
          status: 'COMPLETED',
        },
        {
          code: 'DISPATCHED',
          title: 'Carrier Flatbed Dispatched from Regional Yard',
          completedAt: '2026-10-28T14:30:00Z',
          status: 'COMPLETED',
        },
        {
          code: 'IN_TRANSIT',
          title: 'In Transit to Baramati Delivery Hub (GPS Tracked)',
          completedAt: '2026-10-29T18:00:00Z',
          status: 'COMPLETED',
        },
        {
          code: 'ARRIVED_AT_HUB',
          title: 'Arrived at Baramati Hub - PDI In Progress',
          completedAt: '2026-10-30T09:15:00Z',
          status: 'COMPLETED',
        },
        { code: 'DELIVERED', title: 'Customer Handover & OTP Verification', status: 'IN_PROGRESS' },
      ],
      odometerKmAtPdi: 38,
      documentChecklist: [
        { name: 'Form 20 RTO Application', verified: true },
        { name: 'Form 21 Sale Certificate', verified: true },
        { name: 'Form 22 Pollution & Roadworthiness', verified: true },
        { name: 'Insurance Cover Note (1-Yr Comprehensive + 3-Yr Third Party)', verified: true },
        { name: 'Fastag Activated', verified: true },
        { name: 'PDI Checklist Signed (<100 km)', verified: true },
      ],
    };

    this.bookings.set(booking1.id, booking1);

    // 6. Platform Disputes (for Admin Agent)
    const dispute1: PlatformDispute = {
      id: 'disp-solapur-901',
      bookingId: 'bkg-solapur-502',
      dealerId: 'dealer-solapur-scorpio',
      buyerId: 'buyer-solapur-44',
      reason: 'ODOMETER_OVER_100KM',
      description:
        'Vehicle arrived at delivery hub with 186 km odometer reading, exceeding the strict 100 km platform PDI limit.',
      status: 'OPEN',
      filedAt: '2026-10-30T16:00:00Z',
    };

    this.disputes.set(dispute1.id, dispute1);
  }
}

export const platformStore = new PlatformStore();
