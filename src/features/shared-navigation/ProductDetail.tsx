'use client';

import { ProductPhoto } from '@/features/product-media/ProductPhoto';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Package, MapPin, User } from 'lucide-react';
import { productService } from '@/services/productService';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PRODUCT_CATEGORIES } from '@/models/product';
import { formatPrice } from '@/utils/formatters';
import { ROUTES } from '@/lib/constants';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Product } from '@/models/product';

import { useAuth } from '@/features/auth/AuthContext';
import { orderService } from '@/services/orderService';
import { Button } from '@/components/ui/Button';

function OrderRequest({ product }: { product: Product }) {
  const { userProfile } = useAuth();
  const [quantity, setQuantity] = useState(String(product.minimumOrderQuantity));
  const [state, setState] = useState<'ready' | 'pending' | 'sent'>('ready');
  const [error, setError] = useState('');
  if (userProfile?.role !== 'buyer') return <Alert variant="info">Sign in with a buyer account to request this product.</Alert>;
  if (state === 'sent') return <Alert variant="success">Your request is pending. <Link href={ROUTES.BUYER_ORDERS}>View My Orders</Link></Alert>;
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault();
    if (state !== 'ready') return;
    setError('');
    setState('pending');
    try {
      await orderService.request(userProfile, product, Number(quantity));
      setState('sent');
    } catch {
      setError('The request could not be confirmed. Check My Orders and current availability before retrying.');
      setState('ready');
    }
  }}>
    <label className="block">Quantity ({product.unit})
      <input className="block rounded border p-2" required type="number" min={product.minimumOrderQuantity}
        max={product.quantityAvailable} step="any" value={quantity} onChange={event => setQuantity(event.target.value)} />
    </label>
    <p className="text-sm">The farmer confirms availability when accepting your request.</p>
    {error && <Alert variant="error">{error}</Alert>}
    <Button type="submit" disabled={state === 'pending' || product.quantityAvailable < product.minimumOrderQuantity}>Request order</Button>
  </form>;
}

export default function ProductDetailPage({ marketplace = ROUTES.MARKETPLACE }: { marketplace?: string } = {}) {
  const params = useParams();
  const productId = params.productId as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    productService.getById(productId)
      .then(data => {
        if (!data) { setError('Product not found.'); return; }
        setProduct(data);
      })
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Product details')))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) return (
    <div className="container-page py-10 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-80 bg-neutral-100 rounded-xl animate-pulse"/>
        <div className="space-y-4">{[1,2,3,4].map(i=><div key={i} className="h-10 bg-neutral-100 rounded-lg animate-pulse"/>)}</div>
      </div>
    </div>
  );

  if (error || !product) return (
    <div className="container-page py-10"><Alert variant="error">{error ?? 'Product not found.'}</Alert></div>
  );

  return (
    <div className="container-page py-8 max-w-5xl mx-auto">
      <Link href={marketplace} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4"/> Back to Marketplace
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-primary-50 flex items-center justify-center mb-3">
            {product.images?.[selectedImage] ? (
              <ProductPhoto src={product.images[selectedImage]} alt={product.name} />
            ) : (
              <Package className="w-20 h-20 text-primary-200" aria-hidden/>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 ${i === selectedImage ? 'border-primary-500' : 'border-transparent'}`}>
                  <ProductPhoto src={img} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success">{PRODUCT_CATEGORIES[product.category]}</Badge>
              {product.status !== 'active' && <Badge variant="warning">{product.status}</Badge>}
            </div>
            <h1 className="text-2xl font-bold font-heading text-neutral-900">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary-700">{formatPrice(product.price)}</span>
            <span className="text-neutral-500">per {product.unit}</span>
          </div>

          {product.minimumOrderQuantity > 1 && (
            <p className="text-sm text-neutral-500">Minimum order: {product.minimumOrderQuantity} {product.unit}</p>
          )}

          <div className="p-4 bg-neutral-50 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <MapPin className="w-4 h-4 text-primary-500"/> {product.farmerDistrict}, {product.farmerState}
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <User className="w-4 h-4 text-primary-500"/> Sold by {product.farmerName}
            </div>
            <div className="text-sm text-neutral-600">
              Available: <span className="font-medium">{product.quantityAvailable} {product.unit}</span>
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-neutral-800 mb-2">Description</h2>
            <p className="text-sm text-neutral-600 leading-relaxed">{product.description}</p>
          </div>

          {product.status === 'active' ? (
            <OrderRequest key={product.productId} product={product} />
          ) : (
            <Alert variant="warning">This product is currently unavailable.</Alert>
          )}
        </div>
      </div>
    </div>
  );
}
