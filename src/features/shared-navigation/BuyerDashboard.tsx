'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Package, Search } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderService } from '@/services/orderService';
import { Card, EmptyState, LoadingState, StatCard } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { ButtonLink } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Order } from '@/models/order';

function getOrderLoadError(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Orders');
}

export default function BuyerDashboard({ ordersOnly = false }: { ordersOnly?: boolean }) {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    orderService.getByBuyer(userProfile.uid)
      .then(setOrders)
      .catch((loadError: unknown) => setError(getOrderLoadError(loadError)))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeOrders = orders.filter((o) => !['delivered', 'cancelled', 'rejected'].includes(o.status));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {ordersOnly ? <PageIntro title="My Orders" description="Review the status of your produce orders." /> : <>
      <PageIntro title={`Welcome, ${userProfile?.name?.split(' ')[0] ?? 'buyer'}`} eyebrow="Buyer overview" tone="photo"
        description="Discover produce across Goa and Konkan and manage your orders."
        actions={<ButtonLink href={ROUTES.BUYER_MARKETPLACE} variant="lime" leftIcon={<Search className="size-4" />}>Browse Marketplace</ButtonLink>} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Total Orders" value={loading || error ? '—' : orders.length} icon={<ShoppingBag className="w-5 h-5" />} accentColor="blue" />
        <StatCard label="Active Orders" value={loading || error ? '—' : activeOrders.length} icon={<Package className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="Pending" value={loading || error ? '—' : pendingOrders.length} icon={<Package className="w-5 h-5" />} accentColor="green" />
      </div>

      </>}

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        {!ordersOnly && <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800">My Orders</h2>
          <Link href={ROUTES.BUYER_ORDERS} className="text-xs text-primary-600 font-medium hover:text-primary-700">View all</Link>
        </div>}

        {loading ? (
          <LoadingState label="Loading orders…" />
        ) : error ? null : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="You can browse product listings. New order requests will appear here."
            action={<ButtonLink href={ROUTES.BUYER_MARKETPLACE} variant="secondary">Browse Products</ButtonLink>}
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {(ordersOnly ? orders : orders.slice(0, 6)).map(order => (
              <div key={order.orderId} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{order.productName}</p>
                  <p className="text-xs text-neutral-500">{order.farmerName} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">{formatPrice(order.totalAmount)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
