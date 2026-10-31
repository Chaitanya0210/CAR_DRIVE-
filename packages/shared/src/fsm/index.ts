import {
  BookingStatus,
  CanonicalGroupStatus,
  GroupStatus,
  MoneyState,
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

// 1. Group State Transitions (DB / Prisma Enum Representation)
export const GROUP_TRANSITIONS: Record<GroupStatus, readonly GroupStatus[]> = {
  DRAFT: ['FORMING', 'CANCELLED'],
  FORMING: ['QUORUM_REACHED', 'CANCELLED'],
  QUORUM_REACHED: ['RFQ_ACTIVE', 'FORMING', 'CANCELLED'],
  RFQ_ACTIVE: ['VOTING_OPEN', 'CANCELLED'],
  VOTING_OPEN: ['DEAL_LOCKED', 'RFQ_ACTIVE', 'CANCELLED'],
  DEAL_LOCKED: ['FULFILLMENT', 'VOTING_OPEN', 'CANCELLED'],
  FULFILLMENT: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// 1b. Canonical Group State Transitions (Specification & Platform-Store Representation)
export const CANONICAL_GROUP_TRANSITIONS: Record<
  CanonicalGroupStatus,
  readonly CanonicalGroupStatus[]
> = {
  DRAFT: ['OPEN', 'CANCELLED'],
  OPEN: ['THRESHOLD_MET', 'EXPIRED', 'CANCELLED', 'MERGED'],
  THRESHOLD_MET: ['RFQ_OPEN', 'OPEN', 'CANCELLED'], // Handle drop below threshold if member leaves
  RFQ_OPEN: ['QUOTES_CLOSED', 'CANCELLED'],
  QUOTES_CLOSED: ['VOTING', 'RFQ_OPEN', 'EXPIRED'], // 0 quotes received -> re-run or expire
  VOTING: ['WINNER_SELECTED', 'RFQ_OPEN', 'CANCELLED'], // Tie-break / majority or re-run
  WINNER_SELECTED: ['BOOKING', 'VOTING'], // Winning dealer withdraws -> fallback to runner-up
  BOOKING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  EXPIRED: [],
  CANCELLED: [],
  MERGED: [],
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

// 6. Money & Escrow State Transitions
export const MONEY_TRANSITIONS: Record<MoneyState, readonly MoneyState[]> = {
  INITIATED: ['HELD'],
  HELD: ['RELEASED', 'REFUNDED', 'DISPUTED'],
  DISPUTED: ['RELEASED', 'REFUNDED'],
  RELEASED: [],
  REFUNDED: [],
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
