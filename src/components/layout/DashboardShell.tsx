'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, Menu, X, LogOut } from 'lucide-react';
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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { userProfile, offlineFarmerUid, logout } = useAuth();
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const role = userProfile?.role ?? (offlineFarmerUid ? 'farmer' : 'buyer');
  const displayRole = role === 'worker' ? 'Labour' : role;
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
    <div className="flex min-h-14 items-center gap-2 border-b border-neutral-100 px-4">
      <Link href={home} onClick={mobile ? closeDrawer : undefined} className="flex items-center gap-2 font-heading font-bold text-primary-700">
        <Leaf className="size-5 shrink-0" aria-hidden />{APP_NAME}
      </Link>
      {mobile && <button type="button" aria-label="Close sidebar" onClick={closeDrawer}
        className="ml-auto grid size-11 place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100"><X className="size-5" /></button>}
    </div>
    <div className="border-b border-neutral-100 px-4 py-3">
      <p className="truncate text-sm font-semibold text-neutral-800">{userProfile?.name}</p>
      <p className="text-xs capitalize text-neutral-600">{displayRole}</p>
    </div>
    <nav aria-label="Dashboard navigation" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-2 py-3">
      {groups.map(group => (
        <div key={group.title ?? role}>
          {group.title && <p className="px-3 pb-1 text-xs font-semibold text-neutral-500">{group.title}</p>}
          <ul>{group.links.map(([label, href]) => (
            <li key={href}>
              <Link href={href} onClick={mobile ? closeDrawer : undefined}
                aria-current={active?.[1] === href ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-medium ${active?.[1] === href
                  ? 'bg-primary-50 text-primary-700' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                {label}
              </Link>
            </li>
          ))}</ul>
        </div>
      ))}
    </nav>
    <div className="border-t border-neutral-100 px-4 py-2">
      <button type="button" onClick={() => { if (mobile) closeDrawer(); void logout(); }}
        className="flex min-h-11 w-full items-center gap-2 text-sm text-neutral-600 hover:text-red-600">
        <LogOut className="size-4" aria-hidden /> Sign out
      </button>
    </div>
  </>;

  return (
    <div className="min-h-screen bg-neutral-50">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3">Skip to content</a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-56 flex-col border-r border-neutral-200 bg-white lg:flex xl:w-64">
        {panel()}
      </aside>
      <dialog ref={drawer} id="dashboard-drawer" aria-label="Dashboard menu"
        onClose={() => setDrawerOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeDrawer(); }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[90vw] bg-transparent p-0 backdrop:bg-black/40 lg:hidden">
        {drawerOpen && <div className="flex h-full animate-[dashboard-drawer-in_180ms_ease-out] flex-col bg-white motion-reduce:animate-none">{panel(true)}</div>}
      </dialog>
      <div className="min-w-0 lg:ml-56 xl:ml-64">
        <header className="sticky top-0 z-10 flex min-h-14 items-center gap-3 border-b border-neutral-200 bg-white px-3 sm:px-6">
          <button type="button" className="grid size-11 shrink-0 place-items-center rounded-lg text-neutral-700 hover:bg-neutral-100 lg:hidden"
            aria-label="Open sidebar" aria-controls="dashboard-drawer" aria-expanded={drawerOpen}
            onClick={() => { drawer.current?.showModal(); setDrawerOpen(true); }}><Menu className="size-5" /></button>
          <span className="text-sm font-semibold text-neutral-800">{active?.[0] ?? APP_NAME}</span>
        </header>
        <main id="dashboard-content" tabIndex={-1} className="min-w-0 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
