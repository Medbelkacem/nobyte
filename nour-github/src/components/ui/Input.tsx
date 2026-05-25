import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, id, ...rest },
  ref,
) {
  const inputId = id || `i-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label htmlFor={inputId} className="block">
      {label && (
        <span className="block mb-1.5 text-sm font-semibold text-leather/80 dark:text-ivory/80">
          {label}
        </span>
      )}
      <span className="relative block">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-leather/50 dark:text-ivory/50">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'nobty-input',
            leftIcon && 'pl-10',
            rightSlot && 'pr-12',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
            className,
          )}
          {...rest}
        />
        {rightSlot && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
        )}
      </span>
      {hint && !error && <span className="mt-1 block text-xs text-leather/60 dark:text-ivory/60">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
});
