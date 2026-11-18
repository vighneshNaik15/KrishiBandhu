'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sprout, HardHat, ShoppingBag } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

const ROLES = [
  {
    id: 'farmer',
    icon: Sprout,
    title: 'Farmer',
    description: 'Manage farms and crops, post jobs, sell agricultural products and get AI advice.',
    href: ROUTES.REGISTER_FARMER,
    color: 'border-primary-200 hover:border-primary-500 hover:bg-primary-50',
    iconColor: 'bg-primary-100 text-primary-700',
  },
  {
    id: 'worker',
    icon: HardHat,
    title: 'Agricultural Worker',
    description: 'Find agricultural jobs near you. Coconut harvesting, spraying, weeding and more.',
    href: ROUTES.REGISTER_WORKER,
    color: 'border-blue-200 hover:border-blue-500 hover:bg-blue-50',
    iconColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'buyer',
    icon: ShoppingBag,
    title: 'Buyer',
    description: 'Browse and purchase fresh coconut, cashew, kokum, spices and regional products.',
    href: ROUTES.REGISTER_BUYER,
    color: 'border-accent-200 hover:border-accent-500 hover:bg-accent-50',
    iconColor: 'bg-accent-100 text-accent-700',
  },
] as const;

export default function RegisterPage() {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold font-heading text-neutral-900 mb-2">
          Create your account
        </h1>
        <p className="text-sm text-neutral-500">
          Choose how you will use KrishiBandhu
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <Link
              key={role.id}
              href={role.href}
              className={[
                'flex flex-col items-center text-center p-6 rounded-2xl border-2 bg-white',
                'transition-all duration-150 cursor-pointer group',
                role.color,
              ].join(' ')}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${role.iconColor}`}>
                <Icon className="w-7 h-7" aria-hidden />
              </div>
              <h2 className="font-semibold text-neutral-900 mb-2">{role.title}</h2>
              <p className="text-xs text-neutral-500 leading-relaxed">{role.description}</p>
            </Link>
          );
        })}
      </div>

      <p className="text-center text-sm text-neutral-500 mt-8">
        Already have an account?{' '}
        <Link href={ROUTES.LOGIN} className="text-primary-600 font-semibold hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}
