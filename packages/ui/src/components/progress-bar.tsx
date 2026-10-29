import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '../utils';

export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showCountText?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label = 'Group Fill Progress',
  showCountText = true,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((current / (total || 1)) * 100)));
  const remaining = Math.max(0, total - current);

  return (
    <div className={cn('w-full flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-800 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>{label}</span>
        </span>
        {showCountText && (
          <span className="font-semibold text-neutral-900">
            {current} / {total} <span className="text-xs text-neutral-500 font-normal">buyers</span>
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${label}: ${current} of ${total} buyers joined`}
        className="w-full h-3 rounded-full bg-neutral-200 overflow-hidden"
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{percentage}% quorum reached</span>
        <span>
          {remaining === 0 ? (
            <strong className="text-emerald-700">Quorum reached! RFQ ready</strong>
          ) : (
            `${remaining} more needed to trigger RFQ`
          )}
        </span>
      </div>
    </div>
  );
};
