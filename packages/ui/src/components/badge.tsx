import React from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    neutral: 'bg-neutral-100 text-neutral-800 border-neutral-200',
    primary: 'bg-primary-light text-primary-dark border-red-200',
    success: 'bg-success-light text-success-dark border-success-border',
    warning: 'bg-warning-light text-warning-dark border-warning-border',
    // Distinct deep-crimson for error, distinct from brand red
    error: 'bg-error-light text-error-dark border-error-border',
    info: 'bg-info-light text-info-dark border-info-border',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export interface VerifiedBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  variant?: 'dealer' | 'buyer';
  size?: 'sm' | 'md';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  label = 'Verified Dealer',
  variant = 'dealer',
  size = 'md',
  className,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300',
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {variant === 'dealer' ? (
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
      )}
      <span>{label}</span>
    </span>
  );
};
