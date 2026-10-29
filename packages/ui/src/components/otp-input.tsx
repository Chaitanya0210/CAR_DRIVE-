'use client';
import React, { useRef, useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../utils';

export interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value: controlledValue,
  onChange,
  onComplete,
  error,
  disabled = false,
  className,
}) => {
  const [internalValue, setInternalValue] = useState<string[]>(
    Array(length).fill(''),
  );
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync controlled value if provided
  useEffect(() => {
    if (controlledValue !== undefined) {
      const chars = controlledValue.split('').slice(0, length);
      while (chars.length < length) chars.push('');
      setInternalValue(chars);
    }
  }, [controlledValue, length]);

  const handleChange = (index: number, val: string) => {
    // Only accept numbers
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned && val !== '') return;

    const newValues = [...internalValue];
    const lastChar = cleaned.slice(-1);
    newValues[index] = lastChar;
    setInternalValue(newValues);

    const fullCode = newValues.join('');
    onChange?.(fullCode);

    if (lastChar && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (fullCode.length === length && !newValues.includes('')) {
      onComplete?.(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !internalValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    const newValues = [...internalValue];
    for (let i = 0; i < length; i++) {
      newValues[i] = pasted[i] || '';
    }
    setInternalValue(newValues);

    const fullCode = newValues.join('');
    onChange?.(fullCode);

    const nextIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <fieldset className="flex items-center gap-2 sm:gap-3" disabled={disabled}>
        <legend className="sr-only">Enter {length}-digit verification code</legend>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={internalValue[i]}
            aria-label={`Digit ${i + 1} of ${length}`}
            aria-invalid={!!error}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={cn(
              'w-11 h-12 text-center text-xl font-bold rounded-lg border bg-surface transition-all',
              'min-h-[44px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-offset-1',
              error
                ? 'border-error text-error focus:border-error focus:ring-error'
                : 'border-border text-neutral-900 focus:border-primary focus:ring-primary',
              disabled && 'bg-neutral-100 text-neutral-400 cursor-not-allowed',
            )}
          />
        ))}
      </fieldset>
      {error && (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-xs text-error font-medium"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-error" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
