'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sprout, TreePalm, Briefcase, ShoppingBag, Package, BrainCircuit, ArrowRight, Plus, Store, Warehouse, Tractor, CloudSun } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { farmService } from '@/services/farmService';
import { productService } from '@/services/productService';
import { orderService } from '@/services/orderService';
import { StatCard, EmptyState, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { formatDate, formatPrice } from '@/utils/formatters';
import { cropDiseaseService } from '@/services/cropDiseaseService';

async function loadResource<T>(request: Promise<T[]>, label: string) {
  try {
    return { data: await request, error: null };
  } catch (error) {
    return { data: [] as T[], error: getFirebaseLoadErrorMessage(error, label) };
  }
}

async function loadDashboard(uid: string) {
  const [farms, products, orders, assessments] = await Promise.all([
    loadResource(farmService.getByFarmer(uid), 'Farms'),
    loadResource(productService.getByFarmer(uid), 'Products'),
    loadResource(orderService.getByFarmer(uid), 'Orders'),
    loadResource(cropDiseaseService.getByFarmer(uid), 'Disease assessments'),
  ]);
  return { farms, products, orders, assessments };
}

export default function FarmerDashboardPage() {
  const { userProfile } = useAuth();
  return userProfile ? <FarmerDashboard key={userProfile.uid} farmerId={userProfile.uid} name={userProfile.name} /> : null;
}

function FarmerDashboard({ farmerId, name }: { farmerId: string; name: string }) {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof loadDashboard>>>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void loadDashboard(farmerId).then(result => {
      if (active) setDashboard(result);
    });
    return () => { active = false; };
  }, [farmerId, attempt]);

  const loading = !dashboard;
  const farms = dashboard?.farms.data ?? [];
  const products = dashboard?.products.data ?? [];
  const orders = dashboard?.orders.data ?? [];
  const recentAssessments = dashboard?.assessments.data ?? [];
  const hasError = dashboard && Object.values(dashboard).some(resource => resource.error);

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const activeProducts = products.filter((p) => p.status === 'active');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">
          Welcome, {name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Here&apos;s what&apos;s happening on your farm today.</p>
      </div>

      {hasError && (
        <Alert variant="warning" title="Some dashboard data is unavailable">
          {dashboard.products.error && <p>{dashboard.products.error}</p>}
          <Button className="mt-2" size="sm" variant="secondary" onClick={() => {
            setDashboard(undefined);
            setAttempt(current => current + 1);
          }}>Retry dashboard</Button>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="My Farms"
          value={loading || dashboard?.farms.error ? '—' : farms.length}
          icon={<TreePalm className="w-5 h-5" />}
          accentColor="green"
        />
        <StatCard
          label="Active Products"
          value={loading || dashboard?.products.error ? '—' : activeProducts.length}
          icon={<Package className="w-5 h-5" />}
          accentColor="amber"
        />
        <StatCard
          label="Pending Orders"
          value={loading || dashboard?.orders.error ? '—' : pendingOrders.length}
          icon={<ShoppingBag className="w-5 h-5" />}
          accentColor="blue"
        />
        <StatCard
          label="Total Orders"
          value={loading || dashboard?.orders.error ? '—' : orders.length}
          icon={<Briefcase className="w-5 h-5" />}
          accentColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <h2 className="font-semibold text-neutral-800 mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            {[
              { label: 'Add a Farm', href: ROUTES.FARMER_FARMS_NEW, icon: TreePalm },
              { label: 'Add a Crop', href: ROUTES.FARMER_CROPS_NEW, icon: Sprout },
              { label: 'Post a Job', href: ROUTES.FARMER_JOBS_NEW, icon: Briefcase },
              { label: 'Find a Market', href: ROUTES.FARMER_MARKET_FINDER, icon: Store },
              { label: 'Find Storage', href: ROUTES.FARMER_STORAGE_FINDER, icon: Warehouse },
              { label: 'Harvest & Storage Services', href: ROUTES.FARMER_HARVEST_SERVICES, icon: Tractor },
              { label: 'Post Harvest Request', href: ROUTES.FARMER_HARVEST_REQUEST_NEW, icon: Briefcase },
              { label: 'List a Product', href: ROUTES.FARMER_PRODUCTS_NEW, icon: Package },
              { label: 'Farm Weather', href: ROUTES.FARMER_WEATHER, icon: CloudSun },
              { label: 'Get AI Advisory', href: ROUTES.FARMER_ADVISORY, icon: BrainCircuit },
              { label: 'AI Crop Doctor', href: ROUTES.FARMER_CROP_DOCTOR, icon: BrainCircuit },
              { label: 'Disease Assessments', href: ROUTES.FARMER_CROP_DOCTOR_HISTORY, icon: BrainCircuit },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <Icon className="w-4 h-4" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-neutral-700">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-neutral-300 ml-auto group-hover:text-neutral-500 transition-colors" aria-hidden />
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">Recent Orders</h2>
            <Link href={ROUTES.FARMER_ORDERS} className="text-xs text-primary-600 font-medium hover:text-primary-700">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : dashboard?.orders.error ? (
            <Alert variant="warning">{dashboard.orders.error}</Alert>
          ) : orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Orders from buyers will appear here once you list products."
            />
          ) : (
            <div className="divide-y divide-neutral-100">
              {orders.slice(0, 5).map((order) => (
                <div key={order.orderId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{order.productName}</p>
                    <p className="text-xs text-neutral-500">{order.buyerName} · {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-neutral-900">{formatPrice(order.totalAmount)}</p>
                    <Badge variant={order.status === 'pending' ? 'warning' : order.status === 'delivered' ? 'success' : 'info'}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-neutral-800">Recent disease assessments</h2>
            <p className="mt-1 text-xs text-neutral-500">Model suggestions only; not confirmed diagnoses.</p>
          </div>
          <Link
            href={ROUTES.FARMER_CROP_DOCTOR_HISTORY}
            className="text-xs font-medium text-primary-700 hover:text-primary-800"
          >
            View history
          </Link>
        </div>
        {loading ? (
          <p role="status" className="text-sm text-neutral-500">Loading assessments?</p>
        ) : dashboard?.assessments.error ? (
          <Alert variant="warning">{dashboard.assessments.error}</Alert>
        ) : recentAssessments.length === 0 ? (
          <p className="text-sm text-neutral-500">No saved assessments yet.</p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {recentAssessments.slice(0, 3).map((assessment) => (
              <div key={assessment.assessmentId} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {assessment.selectedCrop} · {assessment.predictedDisease}
                  </p>
                  <p className="text-xs text-neutral-500">{formatDate(assessment.assessedAt)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                  {assessment.status === 'uncertain' ? 'Inconclusive' : 'Unverified'}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link
          href={ROUTES.FARMER_CROP_DOCTOR}
          className="mt-4 inline-flex text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          Start a new assessment
        </Link>
      </Card>

      {/* My Farms */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800">My Farms</h2>
          <Link href={ROUTES.FARMER_FARMS_NEW}>
            <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4" />}>Add Farm</Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-neutral-100 rounded-lg animate-pulse" />)}
          </div>
        ) : dashboard?.farms.error ? (
          <Alert variant="warning">{dashboard.farms.error}</Alert>
        ) : farms.length === 0 ? (
          <EmptyState
            title="No farms added yet"
            description="Add your farm to manage crops, post jobs and track activity."
            action={
              <Link href={ROUTES.FARMER_FARMS_NEW}>
                <Button size="sm" leftIcon={<Plus className="w-4 h-4" />}>Add your first farm</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {farms.slice(0, 6).map((farm) => (
              <Link key={farm.farmId} href={`${ROUTES.FARMER_FARMS}/${farm.farmId}`}>
                <div className="border border-neutral-200 rounded-xl p-4 hover:border-primary-300 hover:bg-primary-50/30 transition-all cursor-pointer">
                  <p className="font-semibold text-neutral-900 text-sm">{farm.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{farm.village ? `${farm.village}, ` : ''}{farm.district}</p>
                  <p className="text-xs text-neutral-400 mt-1">{farm.area} {farm.areaUnit}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
