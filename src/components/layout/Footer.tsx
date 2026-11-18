import React from 'react';
import Link from 'next/link';
import { Leaf, MapPin } from 'lucide-react';
import { APP_NAME, ROUTES } from '@/lib/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="container-page py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href={ROUTES.HOME} className="flex items-center gap-2 text-white font-bold text-lg mb-3">
              <Leaf className="w-5 h-5 text-primary-400" aria-hidden />
              <span className="font-heading">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Connecting farmers, workers and buyers across Goa and the Konkan region.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={ROUTES.MARKETPLACE} className="hover:text-white transition-colors">Marketplace</Link></li>
              <li><Link href={ROUTES.JOBS} className="hover:text-white transition-colors">Job Board</Link></li>
              <li><Link href={ROUTES.ABOUT} className="hover:text-white transition-colors">About Us</Link></li>
            </ul>
          </div>

          {/* Join */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Join as</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href={ROUTES.REGISTER_FARMER} className="hover:text-white transition-colors">Farmer</Link></li>
              <li><Link href={ROUTES.REGISTER_WORKER} className="hover:text-white transition-colors">Agricultural Worker</Link></li>
              <li><Link href={ROUTES.REGISTER_BUYER} className="hover:text-white transition-colors">Buyer</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Region</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-400 shrink-0" aria-hidden />
                <span>Starting in Goa & Konkan, India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-800 pt-6 flex flex-col sm:flex-row justify-between gap-2 text-xs text-neutral-500">
          <p>© {year} {APP_NAME}. All rights reserved.</p>
          <p>Your Trusted Partner in Agriculture</p>
        </div>
      </div>
    </footer>
  );
}
