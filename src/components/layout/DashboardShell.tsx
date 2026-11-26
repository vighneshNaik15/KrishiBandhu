'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase, CloudSun, FileClock, FileText, LayoutDashboard, LogOut, Map, Menu, Package,
  ScanLine, ShoppingBag, Sparkles, Sprout, Store, Tractor, UserRound, Warehouse, X, type LucideIcon,
} from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { useAuth } from '@/features/auth/AuthContext';
import { APP_NAME, ROUTES } from '@/lib/constants';
import type { UserRole } from '@/models/user';

type Group = { title?: string; links: [label: string, href: string][] };

const navigation: Record<UserRole, Group[]> = {
  farmer: [
    { title: 'General', links: [['Dashboard', ROUTES.FARMER_DASHBOARD], ['Profile', ROUTES.FARMER_PROFILE]] },
    { title: 'Farm management', links: [
      ['My Farms', ROUTES.FARMER_FARMS], ['My Crops', ROUTES.FARMER_CROPS],
      ['AI Crop Doctor', ROUTES.FARMER_CROP_DOCTOR], ['Disease History', ROUTES.FARMER_CROP_DOCTOR_HISTORY],
      ['Weather', ROUTES.FARMER_WEATHER],
    ] },
    { title: 'Marketplace & services', links: [
      ['Products', ROUTES.FARMER_PRODUCTS], ['Orders', ROUTES.FARMER_ORDERS], ['Job Board', ROUTES.FARMER_JOBS],
      ['Market Finder', ROUTES.FARMER_MARKET_FINDER], ['Storage Finder', ROUTES.FARMER_STORAGE_FINDER],
      ['Harvest & Storage', ROUTES.FARMER_HARVEST_SERVICES], ['Harvest Requests', ROUTES.FARMER_HARVEST_REQUESTS],
    ] },
    { title: 'AI & support', links: [['AI Advisory', ROUTES.FARMER_ADVISORY], ['Government Schemes', ROUTES.FARMER_SCHEMES]] },
  ],
  worker: [{ links: [
    ['Dashboard', ROUTES.WORKER_DASHBOARD], ['Find Jobs', ROUTES.WORKER_JOBS],
    ['My Applications', ROUTES.WORKER_APPLICATIONS], ['Offer Harvest Services', ROUTES.WORKER_SERVICE_PROFILE],
    ['Harvest & Storage', ROUTES.WORKER_HARVEST_SERVICES], ['Profile', ROUTES.WORKER_PROFILE],
  ] }],
  buyer: [{ links: [
    ['Dashboard', ROUTES.BUYER_DASHBOARD], ['Marketplace', ROUTES.BUYER_MARKETPLACE],
    ['My Orders', ROUTES.BUYER_ORDERS], ['Profile', ROUTES.BUYER_PROFILE],
  ] }],
  admin: [{ links: [
    ['Dashboard', ROUTES.ADMIN_DASHBOARD], ['Harvest & Storage Review', ROUTES.ADMIN_HARVEST_SERVICES],
  ] }],
};

const navIcons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard, Profile: UserRound, 'My Farms': Map, 'My Crops': Sprout,
  'AI Crop Doctor': ScanLine, 'Disease History': FileClock, Weather: CloudSun,
  Products: Package, Orders: ShoppingBag, 'Job Board': Briefcase, 'Market Finder': Store,
  'Storage Finder': Warehouse, 'Harvest & Storage': Tractor, 'Harvest Requests': FileText,
  'AI Advisory': Sparkles, 'Government Schemes': FileText, 'Find Jobs': Briefcase,
  'My Applications': FileClock, 'Offer Harvest Services': Tractor, Marketplace: Store,
  'My Orders': ShoppingBag, 'Harvest & Storage Review': Warehouse,
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { userProfile, offlineFarmerUid, logout } = useAuth();
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = userProfile?.role ?? (offlineFarmerUid ? 'farmer' : 'buyer');
  const displayRole = role === 'worker' ? 'Worker' : role.charAt(0).toUpperCase() + role.slice(1);
  const accountName = userProfile?.name || (offlineFarmerUid ? 'Offline farmer' : 'Account');
  const initial = accountName.charAt(0).toUpperCase();
  const groups = navigation[role];
  const home = groups[0].links[0][1];
  const active = groups.flatMap(group => group.links)
    .filter(([, href]) => pathname === href || (href !== home && pathname.startsWith(href + '/')))
    .reduce<[string, string] | undefined>((best, link) => !best || link[1].length > best[1].length ? link : best, undefined);

  useEffect(() => { drawer.current?.close(); }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const desktop = window.matchMedia('(min-width: 64rem)');
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previous;
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [drawerOpen]);

  const closeDrawer = () => drawer.current?.close();
  const panel = (mobile = false) => <>
    <div className="flex min-h-[4.4rem] shrink-0 items-center justify-between gap-2 border-b border-white/15 px-6 py-2">
      <Brand href={home} onClick={mobile ? closeDrawer : undefined} showLogo />
      {mobile && <button type="button" aria-label="Close sidebar" onClick={closeDrawer}
        className="grid size-11 shrink-0 place-items-center rounded-lg text-ivory transition-colors hover:bg-white/10"><X className="size-5" aria-hidden /></button>}
    </div>
    <nav aria-label="Dashboard navigation"
      className="dashboard-sidebar-nav min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4">
      {groups.map(group => (
        <div key={group.title ?? role}>
          {group.title && <p className="px-3 pb-1.5 text-xs font-semibold tracking-wide text-[#aec6ae]">{group.title}</p>}
          <ul className="space-y-1">{group.links.map(([label, href]) => {
            const Icon = navIcons[label];
            return (
              <li key={href}>
                <Link href={href} title={label} onClick={mobile ? closeDrawer : undefined}
                  aria-current={active?.[1] === href ? 'page' : undefined}
                  className="dashboard-sidebar-link flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold leading-tight transition-colors lg:min-h-10">
                  <span className="grid size-[1.125rem] shrink-0 place-items-center" aria-hidden>
                    {Icon && <Icon className="size-full" strokeWidth={1.75} />}
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                </Link>
              </li>
            );
          })}</ul>
        </div>
      ))}
    </nav>
    <div className="shrink-0 border-t border-white/15 px-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div className="flex min-w-0 items-center gap-3 px-3 py-1">
        <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white/12 text-sm font-semibold text-lime">{initial}</span>
        <div className="min-w-0">
          <p title={accountName} className="truncate text-sm font-semibold text-ivory">{accountName}</p>
          <p className="text-xs text-[#aec6ae]">{displayRole} workspace</p>
        </div>
      </div>
      <button type="button" onClick={() => { if (mobile) closeDrawer(); void logout(); }}
        className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium whitespace-nowrap text-ivory transition-colors hover:bg-white/10">
        <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
          <LogOut className="size-[1.125rem]" strokeWidth={1.75} />
        </span>
        Sign out
      </button>
    </div>
  </>;

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <a href="#dashboard-content" className="skip-link">Skip to content</a>
      <aside className="theme-forest sticky top-0 z-20 hidden h-dvh min-h-0 min-w-0 flex-col self-start bg-linear-to-b from-forest to-[#142e23] lg:flex">
        {panel()}
      </aside>
      <dialog ref={drawer} id="dashboard-drawer" aria-label="Dashboard menu"
        onClose={() => setDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[90vw] overflow-hidden bg-transparent p-0 backdrop:bg-forest/65 lg:hidden">
        {drawerOpen && <div className="theme-forest flex h-full min-h-0 animate-[dashboard-drawer-in_180ms_ease-out] flex-col motion-reduce:animate-none">{panel(true)}</div>}
      </dialog>
      <div className="min-w-0">
        <header className="sticky top-0 z-10 flex min-h-[4.4rem] items-center gap-3 border-b border-neutral-200 bg-white/95 px-3 backdrop-blur-sm sm:px-7">
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-forest hover:bg-primary-100 lg:hidden"
            aria-label="Open sidebar" aria-controls="dashboard-drawer" aria-expanded={drawerOpen}
            onClick={() => { drawer.current?.showModal(); setDrawerOpen(true); }}><Menu className="size-5" /></button>
          <span className="hidden text-sm text-neutral-600 lg:inline">{displayRole} workspace <span className="ml-2 text-neutral-400" aria-hidden>/</span></span>
          <span className="min-w-0 truncate text-sm font-semibold text-forest">{active?.[0] ?? APP_NAME}</span>
          <span title={accountName} aria-hidden className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-lime text-sm font-semibold text-forest">{initial}</span>
        </header>
        <main id="dashboard-content" tabIndex={-1} className="min-w-0 p-3 sm:p-7 xl:px-9">{children}</main>
      </div>
    </div>
  );
}
