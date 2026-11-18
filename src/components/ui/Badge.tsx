import React from 'react';
import type { OrderStatus } from '@/models/order';
import type { ProductStatus } from '@/models/product';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:  'bg-neutral-100 text-neutral-700 border-neutral-200',
  success:  'bg-primary-50 text-primary-700 border-primary-200',
  warning:  'bg-accent-50 text-accent-700 border-accent-200',
  error:    'bg-red-50 text-red-700 border-red-200',
  info:     'bg-blue-50 text-blue-700 border-blue-200',
  neutral:  'bg-neutral-100 text-neutral-600 border-neutral-200',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-neutral-400',
  success: 'bg-primary-500',
  warning: 'bg-accent-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  neutral: 'bg-neutral-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
};

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center font-medium rounded-full border',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant]}`} />
      )}
      {children}
    </span>
  );
}

// ── Helpers to map domain statuses to Badge variants ──────────

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const variantMap: Record<OrderStatus, BadgeVariant> = {
    pending:    'warning',
    accepted:   'success',
    rejected:   'error',
    packed:     'info',
    dispatched: 'info',
    delivered:  'success',
    cancelled:  'neutral',
  };

  const labelMap: Record<OrderStatus, string> = {
    pending:    'Pending',
    accepted:   'Accepted',
    rejected:   'Rejected',
    packed:     'Packed',
    dispatched: 'Dispatched',
    delivered:  'Delivered',
    cancelled:  'Cancelled',
  };

  return (
    <Badge variant={variantMap[status]} dot size="md">
      {labelMap[status]}
    </Badge>
  );
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  const variantMap: Record<ProductStatus, BadgeVariant> = {
    active:       'success',
    inactive:     'neutral',
    out_of_stock: 'warning',
  };

  const labelMap: Record<ProductStatus, string> = {
    active:       'Active',
    inactive:     'Inactive',
    out_of_stock: 'Out of Stock',
  };

  return (
    <Badge variant={variantMap[status]} dot>
      {labelMap[status]}
    </Badge>
  );
}
