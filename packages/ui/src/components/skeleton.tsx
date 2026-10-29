import React from 'react';
import { cn } from '../utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  const variantStyles = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return (
    <div
      role="status"
      aria-label="Loading content..."
      aria-busy="true"
      className={cn(
        'animate-pulse bg-neutral-200/80',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
