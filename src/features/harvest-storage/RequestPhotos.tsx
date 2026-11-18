'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getBlob, ref } from 'firebase/storage';
import { Alert } from '@/components/ui/Alert';
import { storage } from '@/lib/firebase/config';

export function RequestPhotos({ paths }: { paths: string[] }) {
  const [images, setImages] = useState<{ path: string; url: string }[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    let urls: string[] = [];

    if (paths.length === 0) return;

    Promise.all(paths.map(async (path) => {
      const blob = await getBlob(ref(storage, path));
      return { path, url: URL.createObjectURL(blob) };
    })).then((loaded) => {
      urls = loaded.map((image) => image.url);
      if (active) setImages(loaded);
      else urls.forEach(URL.revokeObjectURL);
    }).catch(() => {
      if (active) setError(true);
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
      {error && <Alert variant="error">One or more request photographs could not be loaded.</Alert>}
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
