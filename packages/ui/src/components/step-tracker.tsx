import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils';

export interface StepItem {
  id: string;
  title: string;
  description?: string;
}

export interface StepTrackerProps {
  steps: StepItem[];
  currentStepIndex: number; // 0-indexed
  className?: string;
}

export const StepTracker: React.FC<StepTrackerProps> = ({ steps, currentStepIndex, className }) => {
  return (
    <nav aria-label="Deal & Delivery Progress" className={cn('w-full', className)}>
      <ol className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isUpcoming = index > currentStepIndex;

          return (
            <li
              key={step.id}
              className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 w-full"
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors',
                    isCompleted && 'bg-emerald-600 text-white',
                    isCurrent && 'bg-primary text-white ring-4 ring-primary-light',
                    isUpcoming && 'bg-neutral-200 text-neutral-700',
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : index + 1}
                </div>
                <div className="flex flex-col min-w-0">
                  <span
                    className={cn(
                      'text-xs sm:text-sm font-semibold truncate',
                      isCurrent && 'text-primary',
                      isCompleted && 'text-neutral-900',
                      isUpcoming && 'text-neutral-600',
                    )}
                  >
                    {step.title}
                  </span>
                  {step.description && (
                    <span className="text-[11px] sm:text-xs text-neutral-600 truncate hidden lg:inline">
                      {step.description}
                    </span>
                  )}
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'hidden md:block flex-1 h-0.5 mx-1 sm:mx-2 min-w-[12px]',
                    index < currentStepIndex ? 'bg-emerald-600' : 'bg-neutral-200',
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
