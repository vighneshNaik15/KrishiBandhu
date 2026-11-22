'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Warehouse } from 'lucide-react';
import { userService } from '@/services/userService';
import { StatCard, Card } from '@/components/ui/Card';
import { ROUTES } from '@/lib/constants';
import type { User } from '@/models/user';

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService.listAll(100)
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const farmers = users.filter(u => u.role === 'farmer');
  const workers = users.filter(u => u.role === 'worker');
  const buyers = users.filter(u => u.role === 'buyer');

  const quickLinks = [
    { label: 'Harvest & Storage Review', href: ROUTES.ADMIN_HARVEST_SERVICES, icon: Warehouse },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Admin Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">KrishiBandhu platform overview.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={loading ? '—' : users.length} icon={<Users className="w-5 h-5" />} accentColor="blue" />
        <StatCard label="Farmers" value={loading ? '—' : farmers.length} icon={<Users className="w-5 h-5" />} accentColor="green" />
        <StatCard label="Workers" value={loading ? '—' : workers.length} icon={<Users className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="Buyers" value={loading ? '—' : buyers.length} icon={<Users className="w-5 h-5" />} accentColor="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/40 transition-all">
                  <Icon className="w-5 h-5 text-primary-600" aria-hidden />
                  <span className="text-sm font-medium text-neutral-700">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-800">Recent Users</h2>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-12 bg-neutral-100 rounded-lg animate-pulse"/>)}</div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {users.slice(0, 6).map(user => (
                <div key={user.uid} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs shrink-0">
                      {user.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">{user.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                    user.role === 'farmer' ? 'bg-primary-100 text-primary-700' :
                    user.role === 'worker' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'admin' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{user.role}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
