import React from 'react';
import { Inbox } from 'lucide-react';

// ── Card ──────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm:   'p-4',
  md:   'p-5 md:p-6',
  lg:   'p-6 md:p-8',
};

export function Card({ children, className = '', padding = 'md', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white rounded-xl border border-neutral-200 shadow-panel',
        hover
          ? 'hover:border-primary-300 hover:shadow-md transition-[border-color,box-shadow] duration-150'
          : '',
        paddingStyles[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

// ── Stat Card (Dashboard) ─────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  subtitle?: string;
  accentColor?: 'green' | 'amber' | 'blue' | 'red';
}

const accentIconBg = {
  green: 'bg-primary-100 text-primary-700',
  amber: 'bg-accent-100 text-accent-700',
  blue:  'bg-blue-100 text-blue-700',
  red:   'bg-red-100 text-red-700',
};

export function StatCard({
  label,
  value,
  icon,
  subtitle,
  accentColor = 'green',
}: StatCardProps) {
  return (
    <Card padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-600">{label}</p>
          <p className="mt-1 font-heading text-4xl leading-none tabular-nums text-forest">{value}</p>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentIconBg[accentColor]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Empty State ───────────────────────────────────────────────

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center px-3 py-9 text-center sm:py-12 ${className}`}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-50 text-primary-700" aria-hidden>
        {icon ?? <Inbox className="size-5" />}
      </div>
      <h3 className="mb-1 text-lg font-semibold text-forest">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}

export function LoadingState({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div role="status" className={`flex min-h-28 items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600 ${className}`}>
      <span aria-hidden className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700 motion-reduce:animate-none" />
      {label}
    </div>
  );
}
