import React, { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id: providedId, required, ...props }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-neutral-800">
            {label}
            {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'flex w-full rounded-lg border bg-surface px-3.5 py-2.5 text-base text-neutral-900 placeholder:text-neutral-400',
            'min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
            error
              ? 'border-error text-error focus:border-error focus:ring-error'
              : 'border-border focus:border-primary focus:ring-primary',
            props.disabled && 'bg-neutral-100 text-neutral-500 cursor-not-allowed',
            className,
          )}
          {...props}
        />
        {error ? (
          <div
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-xs text-error font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-error" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-neutral-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
