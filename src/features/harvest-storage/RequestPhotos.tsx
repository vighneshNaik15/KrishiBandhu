'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { readLegacyPhoto } from '@/services/legacyPhotoService';

export function RequestPhotos({ paths }: { paths: string[] }) {
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const urls: string[] = [];

    if (paths.length === 0) return;

    void Promise.allSettled(paths.map(readLegacyPhoto)).then(results => {
      if (!active) return;
      const loaded = results.flatMap((result, index) => {
        if (result.status === 'rejected') return [];
        const url = URL.createObjectURL(result.value);
        urls.push(url);
        return [{ path: paths[index], url }];
      });
      setImages(loaded);
      setError(loaded.length !== paths.length);
    });

    return () => {
      active = false;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [paths]);

  if (paths.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-semibold text-neutral-800">Farm photographs</h2>
      {error && <Alert variant="warning">One or more saved photographs are unavailable. The request details are still shown.</Alert>}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <Image
              key={image.path}
              src={image.url}
              alt={`Farm request photograph ${index + 1}`}
              width={640}
              height={480}
              unoptimized
              className="h-36 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      )}
    </section>
  );
}
