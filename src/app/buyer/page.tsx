'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Package, Search, Star } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderService } from '@/services/orderService';
import { StatCard, EmptyState, Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Order } from '@/models/order';

function getOrderLoadError(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Orders');
}

export default function BuyerDashboardPage() {
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
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">
          Welcome, {userProfile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Browse fresh Konkan products and manage your orders.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={loading ? '—' : orders.length} icon={<ShoppingBag className="w-5 h-5" />} accentColor="blue" />
        <StatCard label="Active Orders" value={loading ? '—' : activeOrders.length} icon={<Package className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="Pending" value={loading ? '—' : pendingOrders.length} icon={<Package className="w-5 h-5" />} accentColor="green" />
        <StatCard label="Reviews Given" value="—" icon={<Star className="w-5 h-5" />} accentColor="green" />
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h2 className="font-semibold text-neutral-900">Browse Konkan Products</h2>
            <p className="text-sm text-neutral-500 mt-1">Coconut, cashew, kokum, spices and more — directly from farmers.</p>
          </div>
          <Link href={ROUTES.MARKETPLACE}>
            <Button leftIcon={<Search className="w-4 h-4" />}>Browse Marketplace</Button>
          </Link>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800">My Orders</h2>
          <Link href={ROUTES.BUYER_ORDERS} className="text-xs text-primary-600 font-medium hover:text-primary-700">View all</Link>
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />)}</div>
        ) : error ? null : orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Browse the marketplace and place your first order from a Konkan farmer."
            action={<Link href={ROUTES.MARKETPLACE}><Button size="sm">Browse Products</Button></Link>}
          />
        ) : (
          <div className="divide-y divide-neutral-100">
            {orders.slice(0, 6).map(order => (
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
