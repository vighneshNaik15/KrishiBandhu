import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { APP_NAME, ROUTES } from '@/lib/constants';

const footerGroups = [
  { title: 'Explore', links: [
    ['Marketplace', ROUTES.MARKETPLACE], ['Job board', ROUTES.JOBS], ['Market Finder', ROUTES.MARKET_FINDER],
    ['Storage Finder', ROUTES.STORAGE_FINDER], ['Harvest & Storage', ROUTES.HARVEST_SERVICES],
  ] },
  { title: 'Join KrishiBandhu', links: [
    ['Farmer', ROUTES.REGISTER_FARMER], ['Agricultural worker', ROUTES.REGISTER_WORKER],
    ['Buyer', ROUTES.REGISTER_BUYER], ['Sign in', ROUTES.LOGIN],
  ] },
];

export function Footer() {
  return (
    <footer className="public-footer theme-forest">
      <div className="container-page">
        <div className="public-footer-grid">
          <div>
            <Brand />
            <p className="public-footer-description">A shared workspace for agriculture across Goa and the Konkan region.</p>
          </div>
          {footerGroups.map(({ title, links }) => (
            <div key={title}>
              <h2>{title}</h2>
              <ul>{links.map(([name, href]) => <li key={href}><Link href={href}>{name}</Link></li>)}</ul>
            </div>
          ))}
        </div>
        <div className="public-footer-base">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <span className="flex items-center gap-2"><MapPin className="size-4 text-sand" aria-hidden /> Goa &amp; Konkan, India</span>
        </div>
      </div>
    </footer>
  );
}
