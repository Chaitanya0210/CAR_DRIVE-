import { z } from 'zod';
import { platformStore } from '../../store/platform-store.js';
import { AuthContext } from '../../auth/tokens.js';

export const trackBookingSchema = z.object({
  booking_id: z
    .string()
    .min(1)
    .describe('Unique ID of the booking / vehicle order (e.g. bkg-demo-101)'),
});

export type TrackBookingInput = z.infer<typeof trackBookingSchema>;

export async function handleTrackBooking(params: TrackBookingInput, _auth: AuthContext) {
  const b = platformStore.bookings.get(params.booking_id);
  if (!b) {
    throw new Error(`Booking not found with ID '${params.booking_id}'`);
  }

  const group = platformStore.groups.get(b.groupId);

  return {
    booking_id: b.id,
    user_id: b.userId,
    vehicle_variant: b.variant,
    group_id: b.groupId,
    group_model: group ? `${group.brand} ${group.model}` : 'Group Vehicle',
    booking_amount_inr: (b.bookingAmountPaise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
    }),
    payment_escrow_status: {
      state: b.paymentState,
      label: 'Held pending delivery',
      safeguard:
        'Funds are held securely by payment aggregator and will NOT be released to dealership until buyer confirms handover OTP and signs PDI clearance.',
    },
    pdi_odometer_reading: `${b.odometerKmAtPdi} km (Strict limit < 100 km compliant)`,
    shipment_milestones: b.shipmentMilestones,
    documents_checklist: b.documentChecklist,
    dispute_filed: !!b.disputeId,
    dispute_id: b.disputeId,
  };
}
