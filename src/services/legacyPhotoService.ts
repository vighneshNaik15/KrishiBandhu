import { getBlob, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { MAX_IMAGE_SIZE_BYTES } from '@/lib/constants';

export async function readLegacyPhoto(path: string): Promise<Blob> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      getBlob(ref(storage, path), MAX_IMAGE_SIZE_BYTES),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Saved photo could not be loaded.')), 8000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
