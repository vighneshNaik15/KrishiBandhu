import React from 'react';

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
        'bg-white rounded-xl border border-neutral-200',
        hover
          ? 'shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer'
          : 'shadow-sm',
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

const accentStyles = {
  green: 'border-l-primary-500 bg-primary-50/30',
  amber: 'border-l-accent-500 bg-accent-50/30',
  blue:  'border-l-blue-500 bg-blue-50/30',
  red:   'border-l-red-500 bg-red-50/30',
};

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
    <div
      className={[
        'bg-white rounded-xl border border-neutral-200 shadow-sm',
        'border-l-4 p-5',
        accentStyles[accentColor],
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-bold text-neutral-900">{value}</p>
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
    </div>
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
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      {icon && (
        <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mb-4 text-neutral-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-sm mb-5">{description}</p>
      )}
      {action}
    </div>
  );
}
