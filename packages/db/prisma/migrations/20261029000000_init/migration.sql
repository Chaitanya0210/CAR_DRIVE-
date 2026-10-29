-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SellerKycStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerRegistrationFeeStatus" AS ENUM ('UNPAID', 'PAID', 'EXEMPT');

-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('GST_CERTIFICATE', 'PAN_CARD', 'DEALERSHIP_AGREEMENT', 'TRADE_CERTIFICATE', 'CANCELLED_CHEQUE');

-- CreateEnum
CREATE TYPE "KycVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ZoneLevel" AS ENUM ('STATE', 'DISTRICT', 'TALUKA', 'VILLAGE_PINCODE');

-- CreateEnum
CREATE TYPE "ZoneDensityClass" AS ENUM ('METRO', 'URBAN', 'SEMI_URBAN', 'RURAL', 'DEEP_RURAL');

-- CreateEnum
CREATE TYPE "VehicleBodyType" AS ENUM ('HATCHBACK', 'SEDAN', 'COMPACT_SUV', 'SUV', 'MUV', 'EV');

-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('PETROL', 'DIESEL', 'CNG', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "VehicleTransmission" AS ENUM ('MANUAL', 'AUTOMATIC', 'AMT', 'CVT', 'DCT');

-- CreateEnum
CREATE TYPE "VehicleConditionType" AS ENUM ('CLEARANCE', 'DEMO', 'PREVIOUS_YEAR');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('DRAFT', 'FORMING', 'QUORUM_REACHED', 'RFQ_ACTIVE', 'VOTING_OPEN', 'DEAL_LOCKED', 'FULFILLMENT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'VOTED', 'CONFIRMED', 'WITHDRAWN', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('SEALED_BIDDING', 'EVALUATION', 'VOTING_OPEN', 'AWARDED', 'NO_DEAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('SEALED', 'UNSEALED', 'NORMALIZED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "QuoteLineItemCategory" AS ENUM ('EX_SHOWROOM', 'LOGISTICS', 'RTO_TAX', 'INSURANCE', 'ACCESSORIES', 'DISCOUNT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('TOKEN_CONFIRMED', 'DEALER_ACCEPTED', 'CHASSIS_ALLOCATED', 'INVOICED', 'REGISTRATION_COMPLETE', 'DELIVERY_IN_PROGRESS', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TOKEN_HOLD', 'DOWN_PAYMENT', 'FULL_PAYMENT', 'SELLER_ONBOARDING_FEE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('RAZORPAY', 'CASHFREE', 'MOCK');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'PROCESSED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('DISPATCHED', 'IN_TRANSIT', 'ARRIVED_ZONE', 'DOORSTEP_DELIVERED');

-- CreateEnum
CREATE TYPE "OfferEnquiryStatus" AS ENUM ('ENQUIRED', 'TOKEN_HELD', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LedgerAccountType" AS ENUM ('BUYER_ESCROW_HOLD', 'PLATFORM_REVENUE', 'SELLER_RECEIVABLE', 'TAX_PAYABLE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'IN_APP');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BUYER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "primaryZoneId" TEXT,
    "pincode" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealershipLegalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "panNumber" TEXT NOT NULL,
    "cinNumber" TEXT,
    "kycStatus" "SellerKycStatus" NOT NULL DEFAULT 'DRAFT',
    "registrationFeeStatus" "SellerRegistrationFeeStatus" NOT NULL DEFAULT 'UNPAID',
    "commissionRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactPhone" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerBranch" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "branchName" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "isHeadquarters" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerBrandAuthorization" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "certificateUrl" TEXT NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerBrandAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerKyc" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "documentType" "KycDocumentType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "verificationStatus" "KycVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerKyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerRegistrationPayment" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL DEFAULT 1999900,
    "gstAmountPaise" BIGINT NOT NULL DEFAULT 359982,
    "totalAmountPaise" BIGINT NOT NULL DEFAULT 2359882,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayProvider" "PaymentGatewayProvider" NOT NULL DEFAULT 'MOCK',
    "gatewayPaymentRef" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerRegistrationPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "level" "ZoneLevel" NOT NULL,
    "densityClass" "ZoneDensityClass" NOT NULL DEFAULT 'RURAL',
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZoneCluster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leadTalukaId" TEXT NOT NULL,
    "radiusKm" INTEGER NOT NULL DEFAULT 50,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoneCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "countryOfOrigin" TEXT NOT NULL DEFAULT 'India',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bodyType" "VehicleBodyType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CarModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Variant" (
    "id" TEXT NOT NULL,
    "carModelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fuelType" "VehicleFuelType" NOT NULL,
    "transmission" "VehicleTransmission" NOT NULL,
    "engineCc" INTEGER,
    "batteryKwh" DECIMAL(5,2),
    "seatingCapacity" INTEGER NOT NULL DEFAULT 5,
    "baseExShowroomPaise" BIGINT NOT NULL,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantCityPrice" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "exShowroomPaise" BIGINT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantCityPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "targetZoneId" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL DEFAULT 5,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "status" "GroupStatus" NOT NULL DEFAULT 'FORMING',
    "deadline" TIMESTAMP(3) NOT NULL,
    "quorumReachedAt" TIMESTAMP(3),
    "dealLockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "tokenPaidPaise" BIGINT NOT NULL DEFAULT 500000,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPreference" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "preferredColor" TEXT,
    "preferredFuel" "VehicleFuelType",
    "accessoriesNeeded" JSONB,
    "notes" TEXT,

    CONSTRAINT "GroupPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQ" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "status" "RfqStatus" NOT NULL DEFAULT 'SEALED_BIDDING',
    "bidWindowClosesAt" TIMESTAMP(3) NOT NULL,
    "votingClosesAt" TIMESTAMP(3),
    "winningQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RFQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RFQEligibility" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "maxTransitKm" INTEGER NOT NULL DEFAULT 300,
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "eligibleAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RFQEligibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'SEALED',
    "exShowroomPaise" BIGINT NOT NULL,
    "batchGroupDiscountPaise" BIGINT NOT NULL,
    "dealerLogisticsToZonePaise" BIGINT NOT NULL,
    "roadTaxRtoPaise" BIGINT NOT NULL,
    "insuranceEstimatePaise" BIGINT NOT NULL,
    "fastagRegistrationCessPaise" BIGINT NOT NULL,
    "tcsPaise" BIGINT NOT NULL,
    "totalLandedCostPaise" BIGINT NOT NULL,
    "deliveryTimelineDays" INTEGER NOT NULL,
    "validityDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "category" "QuoteLineItemCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingNumber" TEXT NOT NULL,
    "membershipId" TEXT,
    "quoteId" TEXT,
    "offeredVehicleId" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'TOKEN_CONFIRMED',
    "totalOnRoadPaise" BIGINT NOT NULL,
    "tokenAmountPaise" BIGINT NOT NULL,
    "balanceAmountPaise" BIGINT NOT NULL,
    "chassisNumber" TEXT,
    "registrationNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "gatewayProvider" "PaymentGatewayProvider" NOT NULL DEFAULT 'MOCK',
    "gatewayTransactionRef" TEXT,
    "paymentMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "grossDealValuePaise" BIGINT NOT NULL,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "platformCommissionPaise" BIGINT NOT NULL,
    "netPayableToSellerPaise" BIGINT NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryShipment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "logisticsProvider" TEXT NOT NULL,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "trackingNumber" TEXT,
    "originBranchId" TEXT NOT NULL,
    "destinationZoneId" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'DISPATCHED',
    "estimatedDeliveryAt" TIMESTAMP(3) NOT NULL,
    "actualDeliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentMilestone" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationName" TEXT NOT NULL,
    "proofPhotoUrl" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferedVehicle" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "manufactureYear" INTEGER NOT NULL,
    "conditionType" "VehicleConditionType" NOT NULL,
    "odometerKm" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL,
    "regularPricePaise" BIGINT NOT NULL,
    "discountedPricePaise" BIGINT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "galleryUrls" JSONB,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferedVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferEnquiry" (
    "id" TEXT NOT NULL,
    "offeredVehicleId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "destinationZoneId" TEXT NOT NULL,
    "status" "OfferEnquiryStatus" NOT NULL DEFAULT 'ENQUIRED',
    "tokenAmountPaise" BIGINT NOT NULL DEFAULT 500000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfferEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "buyerProfileId" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "entryNumber" SERIAL NOT NULL,
    "accountType" "LedgerAccountType" NOT NULL,
    "bookingId" TEXT,
    "actorId" TEXT,
    "debitPaise" BIGINT NOT NULL DEFAULT 0,
    "creditPaise" BIGINT NOT NULL DEFAULT 0,
    "balanceAfterPaise" BIGINT NOT NULL,
    "narration" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorType" "UserRole" NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT,
    "ipAddress" TEXT,
    "payloadDiff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StateTaxConfig" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "fuelType" "VehicleFuelType" NOT NULL,
    "minPricePaise" BIGINT NOT NULL,
    "maxPricePaise" BIGINT NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "flatFeePaise" BIGINT NOT NULL DEFAULT 0,
    "needsVerification" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StateTaxConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ZoneClusterMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_userId_key" ON "BuyerProfile"("userId");

-- CreateIndex
CREATE INDEX "BuyerProfile_primaryZoneId_idx" ON "BuyerProfile"("primaryZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_gstin_key" ON "SellerProfile"("gstin");

-- CreateIndex
CREATE INDEX "SellerProfile_kycStatus_idx" ON "SellerProfile"("kycStatus");

-- CreateIndex
CREATE INDEX "SellerProfile_registrationFeeStatus_idx" ON "SellerProfile"("registrationFeeStatus");

-- CreateIndex
CREATE INDEX "SellerProfile_gstin_idx" ON "SellerProfile"("gstin");

-- CreateIndex
CREATE INDEX "SellerBranch_zoneId_idx" ON "SellerBranch"("zoneId");

-- CreateIndex
CREATE INDEX "SellerBranch_sellerProfileId_idx" ON "SellerBranch"("sellerProfileId");

-- CreateIndex
CREATE INDEX "SellerBrandAuthorization_brandId_idx" ON "SellerBrandAuthorization"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerBrandAuthorization_sellerProfileId_brandId_key" ON "SellerBrandAuthorization"("sellerProfileId", "brandId");

-- CreateIndex
CREATE INDEX "SellerKyc_sellerProfileId_idx" ON "SellerKyc"("sellerProfileId");

-- CreateIndex
CREATE INDEX "SellerKyc_verificationStatus_idx" ON "SellerKyc"("verificationStatus");

-- CreateIndex
CREATE INDEX "SellerRegistrationPayment_sellerProfileId_idx" ON "SellerRegistrationPayment"("sellerProfileId");

-- CreateIndex
CREATE INDEX "SellerRegistrationPayment_status_idx" ON "SellerRegistrationPayment"("status");

-- CreateIndex
CREATE INDEX "Zone_level_idx" ON "Zone"("level");

-- CreateIndex
CREATE INDEX "Zone_pincode_idx" ON "Zone"("pincode");

-- CreateIndex
CREATE INDEX "Zone_densityClass_idx" ON "Zone"("densityClass");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_parentId_code_key" ON "Zone"("parentId", "code");

-- CreateIndex
CREATE INDEX "ZoneCluster_leadTalukaId_idx" ON "ZoneCluster"("leadTalukaId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CarModel_brandId_slug_key" ON "CarModel"("brandId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Variant_carModelId_name_fuelType_transmission_key" ON "Variant"("carModelId", "name", "fuelType", "transmission");

-- CreateIndex
CREATE UNIQUE INDEX "VariantCityPrice_variantId_zoneId_key" ON "VariantCityPrice"("variantId", "zoneId");

-- CreateIndex
CREATE INDEX "Group_status_idx" ON "Group"("status");

-- CreateIndex
CREATE INDEX "Group_targetZoneId_idx" ON "Group"("targetZoneId");

-- CreateIndex
CREATE INDEX "Group_deadline_idx" ON "Group"("deadline");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_groupId_buyerProfileId_key" ON "Membership"("groupId", "buyerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupPreference_membershipId_key" ON "GroupPreference"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_groupId_key" ON "RFQ"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_rfqNumber_key" ON "RFQ"("rfqNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RFQ_winningQuoteId_key" ON "RFQ"("winningQuoteId");

-- CreateIndex
CREATE INDEX "RFQ_status_idx" ON "RFQ"("status");

-- CreateIndex
CREATE INDEX "RFQ_bidWindowClosesAt_idx" ON "RFQ"("bidWindowClosesAt");

-- CreateIndex
CREATE INDEX "RFQ_votingClosesAt_idx" ON "RFQ"("votingClosesAt");

-- CreateIndex
CREATE INDEX "RFQEligibility_sellerProfileId_idx" ON "RFQEligibility"("sellerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "RFQEligibility_rfqId_sellerProfileId_key" ON "RFQEligibility"("rfqId", "sellerProfileId");

-- CreateIndex
CREATE INDEX "Quote_rfqId_idx" ON "Quote"("rfqId");

-- CreateIndex
CREATE INDEX "Quote_sellerProfileId_idx" ON "Quote"("sellerProfileId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_totalLandedCostPaise_idx" ON "Quote"("totalLandedCostPaise");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_membershipId_key" ON "Vote"("membershipId");

-- CreateIndex
CREATE INDEX "Vote_rfqId_idx" ON "Vote"("rfqId");

-- CreateIndex
CREATE INDEX "Vote_quoteId_idx" ON "Vote"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_membershipId_key" ON "Booking"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_offeredVehicleId_key" ON "Booking"("offeredVehicleId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_createdAt_idx" ON "Booking"("createdAt");

-- CreateIndex
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_bookingId_key" ON "Settlement"("bookingId");

-- CreateIndex
CREATE INDEX "Settlement_sellerProfileId_idx" ON "Settlement"("sellerProfileId");

-- CreateIndex
CREATE INDEX "Settlement_status_idx" ON "Settlement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryShipment_bookingId_key" ON "DeliveryShipment"("bookingId");

-- CreateIndex
CREATE INDEX "DeliveryShipment_status_idx" ON "DeliveryShipment"("status");

-- CreateIndex
CREATE INDEX "DeliveryShipment_destinationZoneId_idx" ON "DeliveryShipment"("destinationZoneId");

-- CreateIndex
CREATE INDEX "ShipmentMilestone_shipmentId_idx" ON "ShipmentMilestone"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferedVehicle_vin_key" ON "OfferedVehicle"("vin");

-- CreateIndex
CREATE INDEX "OfferedVehicle_isAvailable_idx" ON "OfferedVehicle"("isAvailable");

-- CreateIndex
CREATE INDEX "OfferedVehicle_variantId_idx" ON "OfferedVehicle"("variantId");

-- CreateIndex
CREATE INDEX "OfferedVehicle_conditionType_idx" ON "OfferedVehicle"("conditionType");

-- CreateIndex
CREATE INDEX "OfferEnquiry_offeredVehicleId_idx" ON "OfferEnquiry"("offeredVehicleId");

-- CreateIndex
CREATE INDEX "OfferEnquiry_status_idx" ON "OfferEnquiry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_sellerProfileId_idx" ON "Review"("sellerProfileId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_entryNumber_key" ON "LedgerEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "LedgerEntry_accountType_idx" ON "LedgerEntry"("accountType");

-- CreateIndex
CREATE INDEX "LedgerEntry_bookingId_idx" ON "LedgerEntry"("bookingId");

-- CreateIndex
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "StateTaxConfig_needsVerification_idx" ON "StateTaxConfig"("needsVerification");

-- CreateIndex
CREATE UNIQUE INDEX "StateTaxConfig_zoneId_fuelType_minPricePaise_maxPricePaise_key" ON "StateTaxConfig"("zoneId", "fuelType", "minPricePaise", "maxPricePaise");

-- CreateIndex
CREATE UNIQUE INDEX "_ZoneClusterMembers_AB_unique" ON "_ZoneClusterMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_ZoneClusterMembers_B_index" ON "_ZoneClusterMembers"("B");

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_primaryZoneId_fkey" FOREIGN KEY ("primaryZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBranch" ADD CONSTRAINT "SellerBranch_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBranch" ADD CONSTRAINT "SellerBranch_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBrandAuthorization" ADD CONSTRAINT "SellerBrandAuthorization_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerBrandAuthorization" ADD CONSTRAINT "SellerBrandAuthorization_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerKyc" ADD CONSTRAINT "SellerKyc_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerRegistrationPayment" ADD CONSTRAINT "SellerRegistrationPayment_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoneCluster" ADD CONSTRAINT "ZoneCluster_leadTalukaId_fkey" FOREIGN KEY ("leadTalukaId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarModel" ADD CONSTRAINT "CarModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_carModelId_fkey" FOREIGN KEY ("carModelId") REFERENCES "CarModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantCityPrice" ADD CONSTRAINT "VariantCityPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantCityPrice" ADD CONSTRAINT "VariantCityPrice_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_targetZoneId_fkey" FOREIGN KEY ("targetZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPreference" ADD CONSTRAINT "GroupPreference_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQ" ADD CONSTRAINT "RFQ_winningQuoteId_fkey" FOREIGN KEY ("winningQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQEligibility" ADD CONSTRAINT "RFQEligibility_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RFQEligibility" ADD CONSTRAINT "RFQEligibility_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SellerBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RFQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_offeredVehicleId_fkey" FOREIGN KEY ("offeredVehicleId") REFERENCES "OfferedVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryShipment" ADD CONSTRAINT "DeliveryShipment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryShipment" ADD CONSTRAINT "DeliveryShipment_originBranchId_fkey" FOREIGN KEY ("originBranchId") REFERENCES "SellerBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryShipment" ADD CONSTRAINT "DeliveryShipment_destinationZoneId_fkey" FOREIGN KEY ("destinationZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentMilestone" ADD CONSTRAINT "ShipmentMilestone_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "DeliveryShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferedVehicle" ADD CONSTRAINT "OfferedVehicle_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferedVehicle" ADD CONSTRAINT "OfferedVehicle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "SellerBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferedVehicle" ADD CONSTRAINT "OfferedVehicle_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "Variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferEnquiry" ADD CONSTRAINT "OfferEnquiry_offeredVehicleId_fkey" FOREIGN KEY ("offeredVehicleId") REFERENCES "OfferedVehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferEnquiry" ADD CONSTRAINT "OfferEnquiry_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_buyerProfileId_fkey" FOREIGN KEY ("buyerProfileId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StateTaxConfig" ADD CONSTRAINT "StateTaxConfig_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ZoneClusterMembers" ADD CONSTRAINT "_ZoneClusterMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ZoneClusterMembers" ADD CONSTRAINT "_ZoneClusterMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "ZoneCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ==============================================================================
-- APPEND-ONLY LEDGER CONSTRAINT (PostgreSQL Trigger)
-- ==============================================================================

CREATE OR REPLACE FUNCTION enforce_ledger_entry_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'LedgerEntry is append-only: updates and deletes are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_entry_append_only ON "LedgerEntry";

CREATE TRIGGER trg_ledger_entry_append_only
BEFORE UPDATE OR DELETE ON "LedgerEntry"
FOR EACH ROW
EXECUTE FUNCTION enforce_ledger_entry_append_only();
