'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import { ProductPhoto } from '@/features/product-media/ProductPhoto';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Search, MapPin, Package } from 'lucide-react';
import { productService } from '@/services/productService';
import { Input, Select } from '@/components/ui/Input';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@/models/product';
import { formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Product } from '@/models/product';

const CAT_OPTIONS = [
  { value: '', label: 'All Products' },
  ...Object.entries(PRODUCT_CATEGORIES).map(([v, l]) => ({ value: v, label: l })),
];

function marketplaceErrorMessage(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Products');
}

export default function MarketplacePage({ marketplace = ROUTES.MARKETPLACE }: { marketplace?: string } = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [nextPageCursor, setNextPageCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let active = true;
    productService.getMarketplace({
      category: category ? category as ProductCategory : undefined,
    })
      .then((result) => {
        if (!active) return;
        setProducts(result.products);
        setNextPageCursor(result.lastDoc);
        setHasMore(result.hasMore);
      })
      .catch((loadError: unknown) => {
        if (active) setError(marketplaceErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [category]);

  const changeCategory = (nextCategory: string) => {
    setLoading(true);
    setProducts([]);
    setError(null);
    setLoadMoreError(null);
    setNextPageCursor(null);
    setHasMore(false);
    setCategory(nextCategory);
  };

  const loadMore = async () => {
    if (!nextPageCursor || !hasMore || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const result = await productService.getMarketplace({
        category: category ? category as ProductCategory : undefined,
      }, nextPageCursor);
      setProducts((current) => [...current, ...result.products]);
      setNextPageCursor(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (loadError: unknown) {
      setLoadMoreError(marketplaceErrorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  };

  const searchTerm = search.trim().toLocaleLowerCase();
  const filtered = products.filter(p =>
    !searchTerm ||
    p.name.toLocaleLowerCase().includes(searchTerm) ||
    p.description?.toLocaleLowerCase().includes(searchTerm) ||
    p.farmerName?.toLocaleLowerCase().includes(searchTerm) ||
    p.farmerDistrict?.toLocaleLowerCase().includes(searchTerm) ||
    p.farmerState?.toLocaleLowerCase().includes(searchTerm)
  );

  return (
    <div className="container-page directory-page">
      <PageIntro title="Agricultural Marketplace"
        description="Browse produce listed by farmers across Goa and the Konkan region." tone="forest" />

      {/* Filters */}
      <div className="directory-filters">
        <Input
          label="Search listings"
          aria-label="Search marketplace"
          placeholder="Search products, farmers, locations..."
          leftIcon={<Search className="w-4 h-4"/>}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          label="Product category"
          aria-label="Product category"
          options={CAT_OPTIONS}
          value={category}
          onChange={e => changeCategory(e.target.value)}
          disabled={loading || loadingMore}
          className="sm:w-52"
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 bg-neutral-100 rounded-xl animate-pulse"/>
          ))}
        </div>
      ) : error ? null : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8"/>}
          title="No products found"
          description={hasMore
            ? 'No matching product is in the loaded results yet. Load more listings to continue the search.'
            : search || category
              ? 'No active listings match these filters. Try another search or category.'
              : 'No products are currently listed. Check back soon!'}
          action={hasMore ? (
            <Button onClick={() => void loadMore()} isLoading={loadingMore}>
              Load more products
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(product => (
            <Link key={product.productId} href={`${marketplace}/${product.productId}`}>
              <Card hover padding="none" className="h-full overflow-hidden">
                {/* Product image */}
                <div className="relative h-44 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                  {product.images?.[0] ? (
                    <ProductPhoto src={product.images[0]} alt={product.name} />
                  ) : (
                    <Package className="size-11 text-primary-500" strokeWidth={1.35} aria-hidden />
                  )}
                </div>

                {/* Info */}
                <div className="space-y-3 p-4 sm:p-5">
                  <Badge variant="success">{PRODUCT_CATEGORIES[product.category]}</Badge>
                  <div>
                    <h2 className="truncate-2 wrap-anywhere text-lg font-semibold text-forest">{product.name}</h2>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-neutral-600">
                      <MapPin className="mt-1 size-3.5 shrink-0 text-primary-600" aria-hidden /> {product.farmerDistrict}, {product.farmerState}
                    </p>
                  </div>
                  <p className="truncate-2 text-sm text-neutral-600">{product.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-2.5">
                    <div>
                      <span className="text-lg font-bold text-forest">{formatPrice(product.price)}</span>
                      <span className="ml-1 text-xs text-neutral-500">/{product.unit}</span>
                    </div>
                    <span className="text-xs text-neutral-600">{product.quantityAvailable} {product.unit} left</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      {!loading && !error && filtered.length > 0 && hasMore && (
        <div className="mt-8 flex justify-center">
          <Button onClick={() => void loadMore()} isLoading={loadingMore}>
            Load more products
          </Button>
        </div>
      )}
      {loadMoreError && <Alert variant="error" className="mt-4">{loadMoreError}</Alert>}
    </div>
  );
}
