import {
  BookingStatus,
  GroupStatus,
  QuoteStatus,
  RfqStatus,
  SellerKybStatus,
} from '../types/index.js';

export class IllegalStateTransitionError extends Error {
  constructor(
    public readonly entity: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Illegal state transition for ${entity}: Cannot transition from '${from}' to '${to}'`);
    this.name = 'IllegalStateTransitionError';
  }
}

// 1. Group State Transitions
export const GROUP_TRANSITIONS: Record<GroupStatus, readonly GroupStatus[]> = {
  DRAFT: ['FORMING', 'CANCELLED'],
  FORMING: ['QUORUM_REACHED', 'CANCELLED'],
  QUORUM_REACHED: ['RFQ_ACTIVE', 'CANCELLED'],
  RFQ_ACTIVE: ['VOTING_OPEN', 'CANCELLED'],
  VOTING_OPEN: ['DEAL_LOCKED', 'RFQ_ACTIVE', 'CANCELLED'],
  DEAL_LOCKED: ['FULFILLMENT', 'CANCELLED'],
  FULFILLMENT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// 2. RFQ State Transitions
export const RFQ_TRANSITIONS: Record<RfqStatus, readonly RfqStatus[]> = {
  SEALED_BIDDING: ['EVALUATION', 'CANCELLED'],
  EVALUATION: ['VOTING_OPEN', 'CANCELLED'],
  VOTING_OPEN: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: [],
  REJECTED: [],
  CANCELLED: [],
};

// 3. Quote State Transitions
export const QUOTE_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  SEALED: ['UNSEALED'],
  UNSEALED: ['NORMALIZED', 'REJECTED'],
  NORMALIZED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: [],
  REJECTED: [],
};

// 4. Booking State Transitions
export const BOOKING_TRANSITIONS: Record<BookingStatus, readonly BookingStatus[]> = {
  TOKEN_RESERVED: ['DEALER_CONFIRMED', 'CANCELLED'],
  DEALER_CONFIRMED: ['ALLOCATED', 'CANCELLED'],
  ALLOCATED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

// 5. Seller KYB State Transitions
export const SELLER_KYB_TRANSITIONS: Record<SellerKybStatus, readonly SellerKybStatus[]> = {
  REGISTERED: ['KYB_PENDING'],
  KYB_PENDING: ['KYB_VERIFIED', 'KYB_REJECTED'],
  KYB_REJECTED: ['KYB_PENDING'],
  KYB_VERIFIED: ['FEE_PENDING'],
  FEE_PENDING: ['ACTIVE'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
};

export function assertValidTransition<T extends string>(
  entity: string,
  from: T,
  to: T,
  transitions: Record<T, readonly T[]>,
): void {
  const allowed = transitions[from];
  if (!allowed || !allowed.includes(to)) {
    throw new IllegalStateTransitionError(entity, from, to);
  }
}

export function canTransition<T extends string>(
  from: T,
  to: T,
  transitions: Record<T, readonly T[]>,
): boolean {
  const allowed = transitions[from];
  return !!allowed && allowed.includes(to);
}
