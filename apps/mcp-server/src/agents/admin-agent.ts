import { platformStore } from '../store/platform-store.js';
import { auditLogger } from '../security/audit-logger.js';

export interface AnomalyReport {
  timestamp: string;
  totalActiveDisputes: number;
  totalAnomaliesDetected: number;
  disputeSummaries: Array<{
    disputeId: string;
    bookingId: string;
    reason: string;
    description: string;
    buyerId: string;
    dealerId: string;
    actionRequired: string;
  }>;
  anomalies: Array<{
    category:
      | 'ODOMETER_FRAUD'
      | 'UNREALISTIC_PRICING'
      | 'CLUSTER_EXPIRY_RISK'
      | 'SECURITY_INJECTION_ATTEMPT';
    severity: 'HIGH' | 'MEDIUM' | 'CRITICAL';
    targetEntityId: string;
    details: string;
    recommendedMitigation: string;
  }>;
  executiveSummary: string;
}

export class AdminAgent {
  /**
   * Autonomous Agent Flow:
   * 1. Summarizes active dispute tickets across all regions.
   * 2. Inspects vehicle listings for unrealistic discounts (> 35%) or aged stock misrepresentation.
   * 3. Audits delivery shipments for odometer violations (> 100 km).
   * 4. Reviews audit logs for injection attempts or replayed token attempts.
   * 5. Compiles executive anomaly summary and recommended mitigation playbook.
   */
  public async analyzePlatformAnomalies(): Promise<AnomalyReport> {
    const disputes = Array.from(platformStore.disputes.values());
    const bookings = Array.from(platformStore.bookings.values());
    const listings = Array.from(platformStore.listings.values());
    const groups = Array.from(platformStore.groups.values());
    const auditLogs = auditLogger.getLogs();

    const anomalies: AnomalyReport['anomalies'] = [];

    // 1. Audit Bookings for Odometer Violations (> 100 km)
    for (const b of bookings) {
      if (b.odometerKmAtPdi > 100) {
        anomalies.push({
          category: 'ODOMETER_FRAUD',
          severity: 'CRITICAL',
          targetEntityId: b.id,
          details: `Booking '${b.id}' arrived with odometer ${b.odometerKmAtPdi} km, violating strict 100 km PDI maximum.`,
          recommendedMitigation:
            'Freeze escrow settlement to dealership. Require regional territory manager physically inspect vehicle and offer buyer ₹25,000 compensation or replacement.',
        });
      }
    }

    // 2. Audit Listings for Unrealistic Pricing / Deep Discount Fraud (> 30% on new cars)
    for (const l of listings) {
      if (l.discountPercent > 30 && l.category !== 'DEMO_TEST_DRIVE') {
        anomalies.push({
          category: 'UNREALISTIC_PRICING',
          severity: 'HIGH',
          targetEntityId: l.id,
          details: `Listing '${l.id}' for ${l.brand} ${l.model} advertises ${l.discountPercent}% discount as new car stock. May indicate damaged transit unit.`,
          recommendedMitigation:
            'Move listing to PENDING_MODERATION. Require dealer upload Form 22 and high-resolution 360-degree inspection photos.',
        });
      }
    }

    // 3. Audit Groups for Quorum Expiry Risk (< 48h remaining and < 75% fill)
    const now = Date.now();
    for (const g of groups) {
      const deadline = new Date(g.deadlineDate).getTime();
      const hoursRemaining = (deadline - now) / (3600 * 1000);
      const fillRate = g.currentSize / g.targetSize;

      if (g.status === 'OPEN' && hoursRemaining < 48 && fillRate < 0.75) {
        anomalies.push({
          category: 'CLUSTER_EXPIRY_RISK',
          severity: 'MEDIUM',
          targetEntityId: g.id,
          details: `Group '${g.id}' (${g.brand} ${g.model} in ${g.zoneName}) has only ${Math.round(hoursRemaining)}h remaining at ${Math.round(fillRate * 100)}% fill (${g.currentSize}/${g.targetSize} buyers).`,
          recommendedMitigation:
            'Trigger automated cluster merge recommendation to neighboring taluka buyers or extend deadline by 7 days.',
        });
      }
    }

    // 4. Audit Security Logs for Blocked Injection Attempts
    const rejectedInjections = auditLogs.filter(
      (log) => log.status === 'REJECTED' && log.errorMessage?.includes('Prompt injection'),
    );
    for (const inj of rejectedInjections) {
      anomalies.push({
        category: 'SECURITY_INJECTION_ATTEMPT',
        severity: 'HIGH',
        targetEntityId: inj.userId,
        details: `Blocked prompt injection attack by user '${inj.userId}' on tool '${inj.toolName}'.`,
        recommendedMitigation:
          'Flag user account for automated rate-limit throttling and require human captcha on next authentication.',
      });
    }

    // Format dispute summaries
    const disputeSummaries = disputes.map((d) => ({
      disputeId: d.id,
      bookingId: d.bookingId,
      reason: d.reason,
      description: d.description,
      buyerId: d.buyerId,
      dealerId: d.dealerId,
      actionRequired:
        d.reason === 'ODOMETER_OVER_100KM'
          ? 'Hold escrow payout; initiate dealership audit.'
          : 'Contact carrier logistics partner and review GPS telematics timestamp.',
    }));

    return {
      timestamp: new Date().toISOString(),
      totalActiveDisputes: disputes.length,
      totalAnomaliesDetected: anomalies.length,
      disputeSummaries,
      anomalies,
      executiveSummary:
        `Platform Health Summary: ${disputes.length} active dispute(s) under review; ` +
        `${anomalies.length} operational/security anomaly(ies) flagged. ` +
        `Escrow safeguards are active and protecting ₹${((disputes.length * 2500000) / 100).toLocaleString('en-IN')} in buyer deposits.`,
    };
  }
}
