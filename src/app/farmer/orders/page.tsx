'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { orderService } from '@/services/orderService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { OrderStatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Order, OrderStatus } from '@/models/order';

function getOrderLoadError(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Orders');
}

export default function FarmerOrdersPage() {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    orderService.getByFarmer(userProfile.uid)
      .then(setOrders)
      .catch((loadError: unknown) => setError(getOrderLoadError(loadError)))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    if (!userProfile) return;
    setError(null);
    setUpdating(orderId);
    try {
      await orderService.updateStatus(orderId, status, userProfile.uid);
      setOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, status } : o));
    } catch {
      setError('Failed to update order status.');
    } finally {
      setUpdating(null);
    }
  };

  const getNextActions = (order: Order) => {
    const actions: { label: string; status: OrderStatus }[] = [];
    if (order.status === 'pending') {
      actions.push({ label: 'Accept', status: 'accepted' }, { label: 'Reject', status: 'rejected' });
    } else if (order.status === 'accepted') {
      actions.push({ label: 'Mark Packed', status: 'packed' });
    } else if (order.status === 'packed') {
      actions.push({ label: 'Mark Dispatched', status: 'dispatched' });
    } else if (order.status === 'dispatched') {
      actions.push({ label: 'Mark Delivered', status: 'delivered' });
    }
    return actions;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Orders</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage orders from buyers.</p>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error && orders.length === 0 ? null : orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingBag className="w-8 h-8"/>}
            title="No orders yet"
            description="Online order requests are currently unavailable."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const actions = getNextActions(order);
            return (
              <Card key={order.orderId}>
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-neutral-900">{order.productName}</h3>
                      <OrderStatusBadge status={order.status}/>
                    </div>
                    <p className="text-xs text-neutral-500">From: {order.buyerName}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {order.quantity} {order.productUnit} · {formatDate(order.createdAt)}
                    </p>
                    <p className="text-sm font-semibold text-neutral-900 mt-1">{formatPrice(order.totalAmount)}</p>
                  </div>
                  {actions.length > 0 && (
                    <div className="flex gap-2 shrink-0">
                      {actions.map(action => (
                        <Button
                          key={action.status}
                          size="sm"
                          variant={action.status === 'rejected' ? 'danger' : 'primary'}
                          onClick={() => handleStatusUpdate(order.orderId, action.status)}
                          isLoading={updating === order.orderId}
                          disabled={updating !== null}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
