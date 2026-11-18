/**
 * Format a number as Indian Rupee currency
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a Firestore Timestamp or Date as a readable date string
 */
export function formatDate(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '—';
  const d = 'toDate' in date ? date.toDate() : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a Firestore Timestamp or Date as a readable date-time string
 */
export function formatDateTime(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '—';
  const d = 'toDate' in date ? date.toDate() : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | { toDate: () => Date } | null | undefined): string {
  if (!date) return '—';
  const d = 'toDate' in date ? date.toDate() : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

/**
 * Format a quantity with its unit
 */
export function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}${quantity !== 1 ? 's' : ''}`;
}

/**
 * Get first letter(s) of a name for avatar initials
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Truncate a string to a max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + '…';
}
