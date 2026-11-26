'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { ROUTES } from '@/lib/constants';

const navLinks = [
  { label: 'Marketplace', href: ROUTES.MARKETPLACE },
  { label: 'Jobs', href: ROUTES.JOBS },
  { label: 'Market Finder', href: ROUTES.MARKET_FINDER },
  { label: 'Storage Finder', href: ROUTES.STORAGE_FINDER },
  { label: 'Harvest & Storage', href: ROUTES.HARVEST_SERVICES },
  { label: 'About', href: ROUTES.ABOUT },
];

const dashboardRoutes = {
  farmer: ROUTES.FARMER_DASHBOARD,
  worker: ROUTES.WORKER_DASHBOARD,
  buyer: ROUTES.BUYER_DASHBOARD,
  admin: ROUTES.ADMIN_DASHBOARD,
};

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const accountButton = useRef<HTMLButtonElement>(null);
  const { firebaseUser, userProfile, logout } = useAuth();
  const pathname = usePathname();
  const dashboard = userProfile ? dashboardRoutes[userProfile.role] : ROUTES.LOGIN;

  const closeMenu = () => setMenuOpen(false);
  const signOut = async () => {
    setAccountOpen(false);
    closeMenu();
    await logout();
  };

  const links = (mobile = false) => navLinks.map(({ label, href }) => (
    <Link key={href} href={href}
      aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
      className="public-nav-link" onClick={mobile ? closeMenu : undefined}>
      {label}
    </Link>
  ));

  return (
    <header className="public-header" onKeyDown={event => {
      if (event.key !== 'Escape') return;
      if (menuOpen) { closeMenu(); menuButton.current?.focus(); }
      if (accountOpen) { setAccountOpen(false); accountButton.current?.focus(); }
    }}>
      <a href="#public-content" className="skip-link">Skip to content</a>
      <div className="container-page public-header-row">
        <Brand onClick={closeMenu} showLogo />
        <nav aria-label="Main navigation" className="public-desktop-nav">{links()}</nav>

        <div className="public-desktop-actions">
          {firebaseUser ? (
            <div className="relative" onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) setAccountOpen(false);
            }}>
              <button type="button" ref={accountButton} aria-controls="public-account" aria-expanded={accountOpen}
                onClick={() => setAccountOpen(!accountOpen)}
                className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-forest hover:bg-primary-50">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime text-forest" aria-hidden>
                  {userProfile?.name?.charAt(0)?.toUpperCase() ?? <LayoutDashboard className="size-4" />}
                </span>
                <span className="max-w-28 truncate">{userProfile?.name ?? 'Account'}</span>
                <ChevronDown className="size-4" aria-hidden />
              </button>
              {accountOpen && (
                <div id="public-account" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg">
                  <p className="truncate border-b border-neutral-100 px-3 py-2 text-sm text-neutral-600">{userProfile?.email}</p>
                  <Link href={dashboard} className="public-nav-link mt-1 flex items-center gap-2" onClick={() => setAccountOpen(false)}>
                    <LayoutDashboard className="size-4" aria-hidden /> Dashboard
                  </Link>
                  <button type="button" onClick={signOut} className="public-nav-link flex w-full items-center gap-2 text-red-700">
                    <LogOut className="size-4" aria-hidden /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <ButtonLink href={ROUTES.LOGIN} variant="ghost" size="sm">Sign in</ButtonLink>
              <ButtonLink href={ROUTES.REGISTER} size="sm">Get started</ButtonLink>
            </>
          )}
        </div>

        <button type="button" ref={menuButton} className="public-menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-controls="public-mobile-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {menuOpen && (
        <div className="public-mobile-panel" id="public-mobile-nav">
          <div className="container-page">
            <nav aria-label="Main navigation" className="grid gap-1">{links(true)}</nav>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
              {firebaseUser ? (
                <>
                  <ButtonLink href={dashboard} onClick={closeMenu}>Dashboard</ButtonLink>
                  <button type="button" onClick={signOut} className="public-nav-link flex items-center gap-2 text-red-700">
                    <LogOut className="size-4" aria-hidden /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <ButtonLink href={ROUTES.LOGIN} variant="secondary" onClick={closeMenu}>Sign in</ButtonLink>
                  <ButtonLink href={ROUTES.REGISTER} onClick={closeMenu}>Get started</ButtonLink>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
