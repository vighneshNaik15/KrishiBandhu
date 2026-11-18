'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Leaf, User, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { APP_NAME, ROUTES } from '@/lib/constants';
import { Button } from '@/components/ui/Button';

const NAV_LINKS = [
  { label: 'Marketplace', href: ROUTES.MARKETPLACE },
  { label: 'Jobs', href: ROUTES.JOBS },
  { label: 'Market Finder', href: ROUTES.MARKET_FINDER },
  { label: 'Storage Finder', href: ROUTES.STORAGE_FINDER },
  { label: 'Harvest & Storage', href: ROUTES.HARVEST_SERVICES },
  { label: 'About', href: ROUTES.ABOUT },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { firebaseUser, userProfile, logout } = useAuth();
  const pathname = usePathname();

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
  };

  const getDashboardRoute = () => {
    if (!userProfile) return ROUTES.LOGIN;
    const map = {
      farmer: ROUTES.FARMER_DASHBOARD,
      worker: ROUTES.WORKER_DASHBOARD,
      buyer: ROUTES.BUYER_DASHBOARD,
      admin: ROUTES.ADMIN_DASHBOARD,
    };
    return map[userProfile.role];
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-xs">
      <div className="container-page">
        <nav className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="flex items-center gap-2 font-bold text-xl text-primary-700">
            <Leaf className="w-6 h-6 text-primary-600" aria-hidden />
            <span className="font-heading">{APP_NAME}</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'text-primary-700'
                    : 'text-neutral-600 hover:text-neutral-900',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {firebaseUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors px-3 py-2 rounded-lg hover:bg-neutral-100"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                    {userProfile?.name?.charAt(0)?.toUpperCase() ?? <User className="w-4 h-4" />}
                  </div>
                  <span className="max-w-[120px] truncate">{userProfile?.name ?? 'Account'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-10">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-xs text-neutral-500">Signed in as</p>
                      <p className="text-sm font-medium text-neutral-800 truncate">{userProfile?.email}</p>
                    </div>
                    <Link
                      href={getDashboardRoute()}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href={ROUTES.LOGIN}>
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href={ROUTES.REGISTER}>
                  <Button variant="primary" size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white py-3">
          <div className="container-page flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-neutral-100 mt-2 pt-2 flex flex-col gap-2">
              {firebaseUser ? (
                <>
                  <Link
                    href={getDashboardRoute()}
                    className="px-3 py-2.5 rounded-lg text-sm font-medium text-primary-700 bg-primary-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href={ROUTES.LOGIN} onClick={() => setMenuOpen(false)}>
                    <Button variant="secondary" size="sm" fullWidth>Sign in</Button>
                  </Link>
                  <Link href={ROUTES.REGISTER} onClick={() => setMenuOpen(false)}>
                    <Button variant="primary" size="sm" fullWidth>Get started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
