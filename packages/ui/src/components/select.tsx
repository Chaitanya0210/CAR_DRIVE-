import React, { forwardRef, useId } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, label, error, helperText, options, id: providedId, required, ...props },
    ref,
  ) => {
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
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              'flex w-full appearance-none rounded-lg border bg-surface px-3.5 py-2.5 pr-10 text-base text-neutral-900',
              'min-h-[44px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
              error
                ? 'border-error text-error focus:border-error focus:ring-error'
                : 'border-border focus:border-primary focus:ring-primary',
              props.disabled && 'bg-neutral-100 text-neutral-500 cursor-not-allowed',
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500">
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
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

Select.displayName = 'Select';
