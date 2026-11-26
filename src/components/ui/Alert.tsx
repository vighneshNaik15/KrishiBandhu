import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig: Record<
  AlertVariant,
  { icon: React.ElementType; styles: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    styles: 'bg-primary-50 border-primary-200 text-primary-800',
    iconColor: 'text-primary-600',
  },
  warning: {
    icon: AlertTriangle,
    styles: 'bg-accent-50 border-accent-200 text-accent-800',
    iconColor: 'text-accent-600',
  },
  error: {
    icon: XCircle,
    styles: 'bg-red-50 border-red-200 text-red-800',
    iconColor: 'text-red-600',
  },
  info: {
    icon: Info,
    styles: 'bg-blue-50 border-blue-200 text-blue-800',
    iconColor: 'text-blue-600',
  },
};

export function Alert({ variant = 'info', title, children, onDismiss, className = '' }: AlertProps) {
  const { icon: Icon, styles, iconColor } = alertConfig[variant];

  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={[
        'flex items-start gap-3 rounded-xl border p-4',
        styles,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden />

      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-0.5">{title}</p>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="-my-1 grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
