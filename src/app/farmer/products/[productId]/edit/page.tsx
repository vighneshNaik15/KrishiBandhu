'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ProductForm } from '@/features/product-media/ProductForm';
import { useAuth } from '@/features/auth/AuthContext';
import { Alert } from '@/components/ui/Alert';
import { productService } from '@/services/productService';
import type { Product } from '@/models/product';

export default function EditProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const { userProfile } = useAuth();
  const uid = userProfile?.uid;
  const [loaded, setLoaded] = useState<{ id: string; uid?: string; product?: Product }>();
  useEffect(() => {
    let active = true;
    void productService.getById(productId).then(product => {
      if (active) setLoaded({ id: productId, uid, product: product &&
        (product.farmerId === uid || product.farmerUserId === uid) ? product : undefined });
    }).catch(() => { if (active) setLoaded({ id: productId, uid }); });
    return () => { active = false; };
  }, [productId, uid]);

  if (loaded?.id !== productId || loaded.uid !== uid) return <p role="status">Loading product photos...</p>;
  const { product } = loaded;
  if (!product) return <Alert variant="error">Product unavailable.</Alert>;

  return <ProductForm key={productId} product={product} />;
}
