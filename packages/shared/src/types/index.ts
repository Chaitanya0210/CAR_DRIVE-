export type UserRole = 'BUYER' | 'SELLER' | 'ADMIN';

export type SellerKybStatus =
  | 'REGISTERED'
  | 'KYB_PENDING'
  | 'KYB_VERIFIED'
  | 'KYB_REJECTED'
  | 'FEE_PENDING'
  | 'ACTIVE'
  | 'SUSPENDED';

export type GroupStatus =
  | 'DRAFT'
  | 'FORMING'
  | 'QUORUM_REACHED'
  | 'RFQ_ACTIVE'
  | 'VOTING_OPEN'
  | 'DEAL_LOCKED'
  | 'FULFILLMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export type RfqStatus =
  'SEALED_BIDDING' | 'EVALUATION' | 'VOTING_OPEN' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type QuoteStatus = 'SEALED' | 'UNSEALED' | 'NORMALIZED' | 'ACCEPTED' | 'REJECTED';

export type BookingStatus =
  'TOKEN_RESERVED' | 'DEALER_CONFIRMED' | 'ALLOCATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';

export type CanonicalGroupStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'THRESHOLD_MET'
  | 'RFQ_OPEN'
  | 'QUOTES_CLOSED'
  | 'VOTING'
  | 'WINNER_SELECTED'
  | 'BOOKING'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'MERGED';

export type MoneyState = 'INITIATED' | 'HELD' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';

export type VehicleFuelType = 'PETROL' | 'DIESEL' | 'CNG' | 'ELECTRIC' | 'HYBRID';

export interface LandedCostBreakdown {
  exShowroomPaise: number;
  roadTaxRtoPaise: number;
  insuranceEstimatePaise: number;
  fastagRegistrationCessPaise: number;
  dealerLogisticsToZonePaise: number;
  tcsPaise: number;
  batchGroupDiscountPaise: number;
  totalLandedCostPaise: number;
}
