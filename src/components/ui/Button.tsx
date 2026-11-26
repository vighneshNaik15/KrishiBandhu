import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type LinkVariant = ButtonVariant | 'lime' | 'outline-light';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<LinkVariant, string> = {
  primary:
    'border border-transparent bg-forest-soft text-white hover:bg-forest active:bg-forest disabled:bg-neutral-200 disabled:text-neutral-500 shadow-xs',
  secondary:
    'bg-white text-forest border border-neutral-300 hover:bg-primary-50 hover:border-primary-400 active:bg-primary-100 disabled:opacity-50',
  ghost:
    'border border-transparent bg-transparent text-primary-700 hover:bg-primary-50 active:bg-primary-100 disabled:opacity-50',
  danger:
    'border border-transparent bg-red-700 text-white hover:bg-red-800 active:bg-red-900 disabled:opacity-50 shadow-xs',
  lime:
    'border border-transparent bg-lime text-forest hover:bg-[#e7f2c8] active:bg-primary-300',
  'outline-light':
    'border border-white/60 bg-forest/30 text-white hover:bg-white/15 active:bg-white/25',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-3.5 py-2 min-h-10 gap-1.5',
  md: 'text-sm px-5 py-2.5 min-h-11 gap-2',
  lg: 'text-base px-5 sm:px-6 py-3 min-h-12 gap-2',
};

function buttonClasses(variant: LinkVariant, size: ButtonSize, fullWidth: boolean, className: string) {
  return [
    'inline-flex max-w-full items-center justify-center rounded-lg text-center font-semibold',
    'transition-colors duration-150 disabled:cursor-not-allowed',
    variantStyles[variant],
    sizeStyles[size],
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={buttonClasses(variant, size, fullWidth, className)}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              aria-hidden="true"
              className="animate-spin h-4 w-4 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span>Loading…</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: LinkVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

export function ButtonLink({
  variant = 'primary', size = 'md', fullWidth = false, className = '', leftIcon, children, ...props
}: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses(variant, size, fullWidth, className)}>
      {leftIcon && <span className="shrink-0" aria-hidden>{leftIcon}</span>}
      {children}
    </Link>
  );
}
