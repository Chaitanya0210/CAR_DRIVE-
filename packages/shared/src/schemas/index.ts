import { z } from 'zod';

// Buyer Auth Schemas
export const RequestOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
});

export const VerifyOtpSchema = z.object({
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number starting with 6-9'),
  code: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d+$/, 'OTP must contain numbers only'),
});

// Seller Auth Schemas
export const SellerRegisterSchema = z.object({
  dealershipName: z.string().min(3, 'Dealership name must have at least 3 characters'),
  email: z.string().email('Must be a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  contactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number'),
});

export const SellerLoginSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
  mfaCode: z.string().length(6, 'MFA code must be 6 digits').optional(),
});

export const SellerKybSubmitSchema = z.object({
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Must be a valid 15-character Indian GSTIN',
    ),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Must be a valid 10-character Indian PAN'),
  tradeCertificateUrl: z.string().url('Must be a valid document URL'),
  dealershipAuthorizationUrl: z.string().url('Must be a valid document URL'),
});

// Group Creation & Joining Schemas
export const CreateGroupSchema = z.object({
  variantId: z.string().min(1, 'Car variant is required'),
  talukaId: z.string().min(1, 'Taluka is required'),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit Indian Postal PIN code'),
  targetBuyers: z.number().int().min(2, 'Group must target at least 2 buyers').max(50),
  deadlineDays: z.number().int().min(1).max(30).default(7),
});

export const JoinGroupSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  preferredColor: z.string().optional(),
});

// Dealer Quote Submission Schema
export const SubmitQuoteSchema = z.object({
  rfqId: z.string().min(1, 'RFQ ID is required'),
  exShowroomPaise: z.number().int().positive('Ex-showroom must be a positive integer in paise'),
  batchGroupDiscountPaise: z
    .number()
    .int()
    .nonnegative('Discount must be non-negative in paise'),
  dealerLogisticsToZonePaise: z
    .number()
    .int()
    .nonnegative('Transit cost must be non-negative in paise'),
  deliveryTimelineDays: z.number().int().min(1).max(90),
  notes: z.string().max(500).optional(),
});

// Offered Vehicle Listing Schema
export const CreateOfferedVehicleSchema = z.object({
  variantId: z.string().min(1, 'Variant is required'),
  vin: z.string().min(11).max(17),
  manufactureYear: z
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear() + 1),
  conditionType: z.enum(['CLEARANCE', 'DEMO', 'PREVIOUS_YEAR']),
  odometerKm: z.number().int().nonnegative().default(0),
  color: z.string().min(1),
  regularExShowroomPaise: z.number().int().positive(),
  discountedExShowroomPaise: z.number().int().positive(),
  eligibleStateIds: z.array(z.string()).min(1, 'Must specify at least one eligible state'),
  imageUrl: z.string().url(),
});

// Zone Query Schema
export const ZoneLookupSchema = z.object({
  stateId: z.string().optional(),
  districtId: z.string().optional(),
  talukaId: z.string().optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
});
