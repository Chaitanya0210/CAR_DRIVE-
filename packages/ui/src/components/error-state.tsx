import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description,
  onRetry,
  retryLabel = 'Try Again',
  className,
}) => {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-error-border bg-error-light/30',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-error-light flex items-center justify-center text-error mb-4 shadow-xs">
        <AlertCircle className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-neutral-900 mb-1.5">{title}</h3>
      <p className="text-sm text-neutral-600 max-w-sm mb-6 leading-relaxed">{description}</p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="flex items-center gap-2 border-neutral-300 text-neutral-800 hover:bg-neutral-100"
        >
          <RefreshCw className="w-4 h-4 text-neutral-600" aria-hidden="true" />
          <span>{retryLabel}</span>
        </Button>
      )}
    </div>
  );
};
