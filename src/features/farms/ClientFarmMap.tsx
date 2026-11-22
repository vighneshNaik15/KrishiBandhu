'use client';

import dynamic from 'next/dynamic';

export const FarmMap = dynamic(() => import('./FarmMap'), {
  ssr: false,
  loading: () => <p role="status" className="min-h-64 p-4 text-sm text-neutral-600">Loading map…</p>,
});
