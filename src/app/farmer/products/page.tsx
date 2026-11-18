'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Package, IndianRupee, Edit, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { productService } from '@/services/productService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ProductStatusBadge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { PRODUCT_CATEGORIES } from '@/models/product';
import { formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Product } from '@/models/product';

export default function FarmerProductsPage() {
  const { userProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    productService.getByFarmer(userProfile.uid)
      .then(setProducts)
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Your products')))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === 'active' ? 'inactive' : 'active';
    try {
      await productService.updateStatus(product.productId, newStatus);
      setProducts(prev => prev.map(p => p.productId === product.productId ? { ...p, status: newStatus } : p));
    } catch {
      setError('Failed to update product status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">My Products</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage your agricultural product listings.</p>
        </div>
        <Link href={ROUTES.FARMER_PRODUCTS_NEW}>
          <Button leftIcon={<Plus className="w-4 h-4"/>}>List Product</Button>
        </Link>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-32 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error ? null : products.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="w-8 h-8"/>}
            title="No products listed yet"
            description="List your agricultural products to reach buyers across India."
            action={<Link href={ROUTES.FARMER_PRODUCTS_NEW}><Button leftIcon={<Plus className="w-4 h-4"/>}>List first product</Button></Link>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map(product => (
            <Card key={product.productId}>
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-lg bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover"/>
                  ) : (
                    <Package className="w-8 h-8 text-primary-300"/>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-neutral-900 truncate">{product.name}</h3>
                      <p className="text-xs text-neutral-500">{PRODUCT_CATEGORIES[product.category]}</p>
                    </div>
                    <ProductStatusBadge status={product.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-bold text-primary-700">{formatPrice(product.price)}/{product.unit}</span>
                    <span className="text-xs text-neutral-400">{product.quantityAvailable} {product.unit} available</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link href={`${ROUTES.FARMER_PRODUCTS}/${product.productId}/edit`}>
                      <Button size="sm" variant="secondary" leftIcon={<Edit className="w-3.5 h-3.5"/>}>Edit</Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleStatus(product)}
                      leftIcon={product.status === 'active' ? <EyeOff className="w-3.5 h-3.5"/> : <Eye className="w-3.5 h-3.5"/>}
                    >
                      {product.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
