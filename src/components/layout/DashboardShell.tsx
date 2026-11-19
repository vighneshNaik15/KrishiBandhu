'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { Leaf, Menu, X, LogOut, Bell } from 'lucide-react';
import type { UserRole } from '@/models/user';

// Nav items per role
const NAV_ITEMS: Record<UserRole, { label: string; href: string; icon?: string }[]> = {
  farmer: [
    { label: 'Dashboard', href: ROUTES.FARMER_DASHBOARD },
    { label: 'Profile', href: ROUTES.FARMER_PROFILE },
    { label: 'My Farms', href: ROUTES.FARMER_FARMS },
    { label: 'My Crops', href: ROUTES.FARMER_CROPS },
    { label: 'Job Board', href: ROUTES.FARMER_JOBS },
    { label: 'Market Finder', href: ROUTES.MARKET_FINDER },
    { label: 'Storage Finder', href: ROUTES.STORAGE_FINDER },
    { label: 'Harvest & Storage', href: ROUTES.HARVEST_SERVICES },
    { label: 'Harvest Requests', href: ROUTES.FARMER_HARVEST_REQUESTS },
    { label: 'Products', href: ROUTES.FARMER_PRODUCTS },
    { label: 'Orders', href: ROUTES.FARMER_ORDERS },
    { label: 'AI Advisory', href: ROUTES.FARMER_ADVISORY },
    { label: 'AI Crop Doctor', href: ROUTES.FARMER_CROP_DOCTOR },
    { label: 'Disease History', href: ROUTES.FARMER_CROP_DOCTOR_HISTORY },
    { label: 'Weather', href: ROUTES.FARMER_WEATHER },
    { label: 'Schemes', href: ROUTES.FARMER_SCHEMES },
  ],
  worker: [
    { label: 'Dashboard', href: ROUTES.WORKER_DASHBOARD },
    { label: 'Find Jobs', href: ROUTES.WORKER_JOBS },
    { label: 'My Applications', href: ROUTES.WORKER_APPLICATIONS },
    { label: 'Offer Harvest Services', href: ROUTES.WORKER_SERVICE_PROFILE },
    { label: 'Harvest & Storage', href: ROUTES.HARVEST_SERVICES },
    { label: 'Profile', href: ROUTES.WORKER_PROFILE },
  ],
  buyer: [
    { label: 'Dashboard', href: ROUTES.BUYER_DASHBOARD },
    { label: 'Marketplace', href: ROUTES.MARKETPLACE },
    { label: 'My Orders', href: ROUTES.BUYER_ORDERS },
    { label: 'Profile', href: ROUTES.BUYER_PROFILE },
  ],
  admin: [
    { label: 'Dashboard', href: ROUTES.ADMIN_DASHBOARD },
    { label: 'Users', href: ROUTES.ADMIN_USERS },
    { label: 'Products', href: ROUTES.ADMIN_PRODUCTS },
    { label: 'Jobs', href: ROUTES.ADMIN_JOBS },
    { label: 'Orders', href: ROUTES.ADMIN_ORDERS },
    { label: 'Schemes', href: ROUTES.ADMIN_SCHEMES },
    { label: 'Reports', href: ROUTES.ADMIN_REPORTS },
    { label: 'Harvest & Storage Review', href: ROUTES.ADMIN_HARVEST_SERVICES },
  ],
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { userProfile, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = userProfile?.role ?? 'buyer';
  const navItems = NAV_ITEMS[role] ?? [];

  return (
    <div className="min-h-screen flex bg-neutral-50">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-neutral-200 shadow-sm',
          'flex flex-col z-30 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-neutral-100">
          <Leaf className="w-5 h-5 text-primary-600" aria-hidden />
          <span className="font-heading font-bold text-primary-700">{APP_NAME}</span>
          <button
            className="ml-auto md:hidden text-neutral-400 hover:text-neutral-700"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              {userProfile?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-neutral-800 truncate">{userProfile?.name}</p>
              <p className="text-xs text-neutral-500 capitalize">{role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={[
                  'flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-5 py-4 border-t border-neutral-100">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-red-600 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 shadow-xs h-14 flex items-center px-4 md:px-6 gap-4">
          <button
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            {/* Page title slot — filled by child pages via context if needed */}
          </div>
          <button className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 relative" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
