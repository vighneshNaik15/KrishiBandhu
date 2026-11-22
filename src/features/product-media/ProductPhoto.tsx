'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Package } from 'lucide-react';

export function ProductPhoto({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState<string>();
  if (!src || failed === src || !/^https?:\/\//i.test(src)) {
    return <div className="grid h-full place-items-center bg-primary-50" aria-label={alt || undefined}>
      <Package aria-hidden className="size-8 text-primary-300" />
    </div>;
  }
  return <Image fill unoptimized src={src} alt={alt} sizes="(max-width: 640px) 90vw, 400px"
    className="object-cover" onError={() => setFailed(src)} />;
}
