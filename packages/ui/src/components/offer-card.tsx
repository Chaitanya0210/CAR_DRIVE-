import React from 'react';
import { formatPaise } from '@groupdrive/shared';
import { MapPin, Sparkles, Tag } from 'lucide-react';
import { cn } from '../utils';
import { Badge, VerifiedBadge } from './badge';
import { Button } from './button';

export interface OfferCardProps {
  id: string;
  vehicleName: string;
  variantDetails: string;
  manufactureYear: number;
  conditionType: 'CLEARANCE' | 'DEMO' | 'PREVIOUS_YEAR';
  odometerKm?: number;
  regularPricePaise: number;
  discountedPricePaise: number;
  imageUrl: string;
  dealerName: string;
  dealerLocation: string;
  isDealerVerified?: boolean;
  eligibleStates: string[];
  onBookNow?: (id: string) => void;
  className?: string;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  id,
  vehicleName,
  variantDetails,
  manufactureYear,
  conditionType,
  odometerKm,
  regularPricePaise,
  discountedPricePaise,
  imageUrl,
  dealerName,
  dealerLocation,
  isDealerVerified = true,
  eligibleStates,
  onBookNow,
  className,
}) => {
  const savingsPaise = regularPricePaise - discountedPricePaise;
  const savingsPercentage = Math.round((savingsPaise / regularPricePaise) * 100);

  const conditionLabels = {
    CLEARANCE: 'Factory Clearance',
    DEMO: 'Dealer Demo Unit',
    PREVIOUS_YEAR: `${manufactureYear} MY Stock`,
  };

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-surface overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col',
        className,
      )}
    >
      {/* Image & Badges */}
      <div className="relative aspect-[16/10] bg-neutral-100 overflow-hidden">
        <img
          src={imageUrl}
          alt={`${vehicleName} ${variantDetails}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-700 text-white shadow-xs">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            Save {savingsPercentage}%
          </span>
          <Badge
            variant="neutral"
            size="sm"
            className="bg-white/90 backdrop-blur-xs font-semibold text-neutral-800"
          >
            {conditionLabels[conditionType]}
          </Badge>
        </div>
      </div>

      {/* Body Details */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between text-xs text-neutral-600 font-medium mb-1">
            <span>{manufactureYear} Model</span>
            {odometerKm !== undefined && odometerKm > 0 && (
              <span>{odometerKm.toLocaleString('en-IN')} km run</span>
            )}
          </div>
          <h4 className="text-base font-bold text-neutral-900 group-hover:text-primary transition-colors">
            {vehicleName}
          </h4>
          <p className="text-xs text-neutral-700">{variantDetails}</p>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-neutral-600">
            <MapPin className="w-3.5 h-3.5 text-neutral-600 shrink-0" aria-hidden="true" />
            <span className="truncate">Eligible in: {eligibleStates.join(', ')}</span>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-border flex items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-600 line-through font-medium">
              <span>MSRP: {formatPaise(regularPricePaise)}</span>
            </div>
            <div className="text-lg font-bold text-neutral-900">
              {formatPaise(discountedPricePaise)}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
              <Tag className="w-3 h-3 text-emerald-700" aria-hidden="true" />
              <span>Save {formatPaise(savingsPaise)}</span>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => onBookNow?.(id)}
            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            Lock Deal
          </Button>
        </div>

        {/* Dealer Tag */}
        <div className="pt-2 text-[11px] text-neutral-600 flex items-center justify-between border-t border-dashed border-neutral-200">
          <span className="truncate font-medium text-neutral-800">
            {dealerName} ({dealerLocation})
          </span>
          {isDealerVerified && <VerifiedBadge size="sm" label="Verified" />}
        </div>
      </div>
    </div>
  );
};
