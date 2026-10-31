import React from 'react';
import { formatPaise, LandedCostBreakdown } from '@groupdrive/shared';
import { Check, Trophy, Truck, ShieldCheck, Info } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './button';
import { Badge, VerifiedBadge } from './badge';

export interface DealerQuoteItem {
  quoteId: string;
  dealerName: string;
  isVerified: boolean;
  dealerLocation: string;
  deliveryDays: number;
  breakdown: LandedCostBreakdown;
  userVoted?: boolean;
}

export interface QuoteComparisonTableProps {
  quotes: DealerQuoteItem[];
  onVoteQuote?: (quoteId: string) => void;
  className?: string;
  votingActive?: boolean;
}

export const QuoteComparisonTable: React.FC<QuoteComparisonTableProps> = ({
  quotes,
  onVoteQuote,
  className,
  votingActive = true,
}) => {
  // Sort quotes by total landed cost ascending (lowest landed cost first)
  const sortedQuotes = [...quotes].sort(
    (a, b) => a.breakdown.totalLandedCostPaise - b.breakdown.totalLandedCostPaise,
  );

  const topQuote = sortedQuotes[0];
  const bestLandedCost = topQuote?.breakdown.totalLandedCostPaise;

  return (
    <div className={cn('w-full max-w-full min-w-0 space-y-4', className)}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-neutral-900">
            Normalized Landed Cost Comparison
          </h3>
          <p className="text-xs text-neutral-600">
            Strictly normalized at delivery zone. No showroom markups or hidden fees.
          </p>
        </div>
        <Badge variant="success" size="sm">
          Strict Zone Delivery Basis
        </Badge>
      </div>

      {/* Trust-Building: "Why this quote ranks #1" Callout */}
      {topQuote && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <Trophy className="w-4 h-4 text-amber-200" aria-hidden="true" />
          </div>
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-bold text-emerald-900 text-sm">
                Why {topQuote.dealerName} Ranks #1
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px] border border-emerald-200">
                Best Value Batch Winner
              </span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              Lowest total on-road price across authorized dealers in your zone (
              <span className="font-bold">
                {formatPaise(topQuote.breakdown.totalLandedCostPaise)}
              </span>
              ), fastest doorstep delivery ({topQuote.deliveryDays} days), and 100% verified OEM
              warranty with zero hidden handling fees.
            </p>
          </div>
        </div>
      )}

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-surface shadow-xs">
        <table className="w-full text-left border-collapse text-sm">
          <caption className="sr-only">
            Sealed dealer quote comparison table showing normalized landed cost breakdown
          </caption>
          <thead>
            <tr className="border-b border-border bg-neutral-50/80">
              <th scope="col" className="p-3.5 font-semibold text-neutral-900 min-w-[180px]">
                Dealer Details
              </th>
              <th scope="col" className="p-3.5 font-semibold text-neutral-900 min-w-[130px]">
                Ex-Showroom
              </th>
              <th scope="col" className="p-3.5 font-semibold text-neutral-900 min-w-[130px]">
                RTO & Taxes
              </th>
              <th scope="col" className="p-3.5 font-semibold text-neutral-900 min-w-[130px]">
                Transit to Zone
              </th>
              <th scope="col" className="p-3.5 font-semibold text-neutral-900 min-w-[120px]">
                Group Discount
              </th>
              <th scope="col" className="p-3.5 font-bold text-primary min-w-[160px]">
                Landed Cost
              </th>
              {votingActive && (
                <th
                  scope="col"
                  className="p-3.5 font-semibold text-neutral-900 text-right min-w-[120px]"
                >
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedQuotes.map((q, idx) => {
              const isBest = q.breakdown.totalLandedCostPaise === bestLandedCost;
              return (
                <tr
                  key={q.quoteId}
                  className={cn(
                    'transition-colors hover:bg-neutral-50/50',
                    isBest && 'bg-emerald-50/30',
                  )}
                >
                  <th scope="row" className="p-3.5 align-top font-normal">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-neutral-900">{q.dealerName}</span>
                        {q.isVerified && <VerifiedBadge />}
                      </div>
                      <span className="text-xs text-neutral-600">
                        {q.dealerLocation} • {q.deliveryDays} days delivery
                      </span>
                      {isBest && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <Trophy className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                          Rank #1 • Lowest Landed Cost
                        </span>
                      )}
                    </div>
                  </th>

                  <td className="p-3.5 align-top font-medium text-neutral-800">
                    <div>{formatPaise(q.breakdown.exShowroomPaise)}</div>
                    <span className="text-[11px] text-neutral-600">Base Catalog</span>
                  </td>

                  <td className="p-3.5 align-top text-neutral-700">
                    <div className="flex flex-col text-xs gap-0.5">
                      <span>RTO: {formatPaise(q.breakdown.roadTaxRtoPaise)}</span>
                      <span>Ins.: {formatPaise(q.breakdown.insuranceEstimatePaise)}</span>
                      {q.breakdown.tcsPaise > 0 && (
                        <span>TCS: {formatPaise(q.breakdown.tcsPaise)}</span>
                      )}
                    </div>
                  </td>

                  <td className="p-3.5 align-top text-neutral-700 font-medium">
                    <div className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-neutral-600 shrink-0" aria-hidden="true" />
                      <span>{formatPaise(q.breakdown.dealerLogisticsToZonePaise)}</span>
                    </div>
                    <span className="text-[11px] text-neutral-600">Doorstep Freight</span>
                  </td>

                  <td className="p-3.5 align-top text-emerald-700 font-semibold">
                    <div>-{formatPaise(q.breakdown.batchGroupDiscountPaise)}</div>
                    <span className="text-[11px] text-emerald-800">Batch Discount</span>
                  </td>

                  <td className="p-3.5 align-top">
                    <div className="flex flex-col">
                      <span className="text-base font-bold text-neutral-900">
                        {formatPaise(q.breakdown.totalLandedCostPaise)}
                      </span>
                      <span className="text-[11px] text-neutral-600 font-medium">
                        All-Inclusive Landed
                      </span>
                    </div>
                  </td>

                  {votingActive && (
                    <td className="p-3.5 align-top text-right">
                      <Button
                        size="sm"
                        variant={q.userVoted ? 'secondary' : 'primary'}
                        onClick={() => onVoteQuote?.(q.quoteId)}
                        className={cn(q.userVoted && 'border border-emerald-500 text-emerald-700')}
                      >
                        {q.userVoted ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                            Voted
                          </>
                        ) : (
                          'Vote Quote'
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Escrow & Trust Protection Note */}
      <div className="p-3 rounded-lg bg-neutral-100/80 border border-neutral-200 text-neutral-700 text-xs flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-neutral-900">Buyer Protection:</strong> ₹25,000
          booking amount is held securely in escrow and only released to the dealership after your
          physical PDI inspection and OTP delivery clearance.
        </span>
      </div>
    </div>
  );
};
