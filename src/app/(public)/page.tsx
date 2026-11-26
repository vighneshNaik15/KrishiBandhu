import Image from 'next/image';
import Link from 'next/link';
import {
  BriefcaseBusiness, CloudSun, MapPin, ScanLine, ShieldCheck, ShoppingBasket,
  Sprout, UserRoundPlus, Warehouse, WifiOff, Wheat,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

const capabilities = [
  {
    title: 'Farm and crop management', icon: Sprout, href: ROUTES.FARMER_FARMS,
    description: 'Map your plots, save field records and keep track of what is growing across your farms.',
  },
  {
    title: 'Crop Doctor', icon: ScanLine, href: ROUTES.FARMER_CROP_DOCTOR,
    description: 'Upload a crop photo for a model-generated assessment and keep your assessment history in one place.',
  },
  {
    title: 'Weather and advisory', icon: CloudSun, href: ROUTES.FARMER_WEATHER,
    description: 'Check a farm-level forecast and use AI Advisory to explore questions about your crops.',
  },
  {
    title: 'Produce marketplace', icon: ShoppingBasket, href: ROUTES.MARKETPLACE,
    description: 'Browse local produce or list your own with a price, available quantity and contact details.',
  },
  {
    title: 'Agricultural jobs', icon: BriefcaseBusiness, href: ROUTES.JOBS,
    description: 'Post farm work, browse local opportunities and keep track of applications.',
  },
  {
    title: 'Harvest and storage', icon: Warehouse, href: ROUTES.HARVEST_SERVICES,
    description: 'Find harvesting services and explore storage records by district.',
  },
];

const setup = [
  {
    title: 'Choose your role', icon: UserRoundPlus,
    description: 'Create an account as a farmer, agricultural worker or buyer to open the tools for your role.',
  },
  {
    title: 'Set up your workspace', icon: Sprout,
    description: 'Add your first farm, set up your worker profile or browse produce in the marketplace.',
  },
  {
    title: 'Plan the work ahead', icon: Wheat,
    description: 'Use your dashboard to keep farm records, listings or applications easy to find.',
  },
];

export default function HomePage() {
  return (
    <div className="landing">
      <section className="landing-hero theme-forest" aria-labelledby="landing-title">
        <Image
          src="/images/konkan-rice-fields.webp"
          alt=""
          fill
          preload
          sizes="100vw"
          className="landing-hero-image"
        />
        <div className="container-page landing-hero-inner">
          <div className="landing-hero-copy">
            <p className="landing-kicker"><MapPin size={15} aria-hidden /> Goa &amp; the Konkan coast</p>
            <h1 id="landing-title">A better way<br />to <em>grow together.</em></h1>
            <p className="landing-lead">
              Manage your farms, understand what’s happening in the field, and connect with local workers and buyers from one workspace.
            </p>
            <div className="landing-actions">
              <ButtonLink href={ROUTES.REGISTER} variant="lime" size="lg">Get started</ButtonLink>
              <ButtonLink href={ROUTES.MARKETPLACE} variant="outline-light" size="lg">Explore marketplace</ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-benefits">
        <div className="container-page landing-benefits-grid">
          <div><MapPin aria-hidden /><p><strong>Built for Goa and Konkan</strong><span>Local markets, crops and services</span></p></div>
          <div><WifiOff aria-hidden /><p><strong>Farm records offline</strong><span>Changes sync when you reconnect</span></p></div>
          <div><ShieldCheck aria-hidden /><p><strong>Role-based workspaces</strong><span>Tools for farmers, workers and buyers</span></p></div>
        </div>
      </div>

      <section id="about" className="container-page landing-section scroll-mt-24" aria-labelledby="platform-title">
        <div className="landing-section-heading">
          <div>
            <p className="landing-kicker">The platform</p>
            <h2 id="platform-title">From field to market.</h2>
          </div>
          <p>Keep daily farm work, crop decisions and the people you rely on within reach.</p>
        </div>
        <div className="landing-feature-grid">
          {capabilities.map(({ title, icon: Icon, href, description }, index) => (
            <Link href={href} key={href} className={index === 0 ? 'landing-feature landing-feature-primary theme-forest' : 'landing-feature'}>
              <span className="landing-feature-icon"><Icon size={23} strokeWidth={1.65} aria-hidden /></span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="landing-setup" aria-labelledby="setup-title">
        <div className="container-page landing-section">
          <div className="landing-section-heading">
            <div>
              <p className="landing-kicker">How it works</p>
              <h2 id="setup-title">Start with what you do.</h2>
            </div>
            <ButtonLink href={ROUTES.REGISTER} variant="secondary">Create an account</ButtonLink>
          </div>
          <ol className="landing-steps">
            {setup.map(({ title, icon: Icon, description }) => (
              <li key={title}>
                <Icon size={26} strokeWidth={1.65} aria-hidden />
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page landing-section">
        <div className="landing-final theme-forest">
          <div>
            <h2>Find the people and tools<br className="hidden sm:block" /> for your next season.</h2>
            <p>Join KrishiBandhu as a farmer, worker or buyer.</p>
          </div>
          <ButtonLink href={ROUTES.REGISTER} variant="lime" size="lg">Get started</ButtonLink>
        </div>
      </section>
    </div>
  );
}
