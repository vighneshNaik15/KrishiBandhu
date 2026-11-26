import Link from 'next/link';
import { BriefcaseBusiness, ShoppingBasket, Sprout } from 'lucide-react';
import { AuthFrame, AuthIntro } from '@/features/auth/AuthFrame';
import { ROUTES } from '@/lib/constants';

const roles = [
  {
    id: 'farmer',
    icon: Sprout,
    title: 'Farmer',
    description: 'Manage your farms and crops, list produce and post farm jobs.',
    href: ROUTES.REGISTER_FARMER,
  },
  {
    id: 'worker',
    icon: BriefcaseBusiness,
    title: 'Agricultural Worker',
    description: 'Find local farm work and follow your job applications.',
    href: ROUTES.REGISTER_WORKER,
  },
  {
    id: 'buyer',
    icon: ShoppingBasket,
    title: 'Buyer',
    description: 'Explore seasonal produce and connect with growers across Goa and Konkan.',
    href: ROUTES.REGISTER_BUYER,
  },
] as const;

export default function RegisterPage() {
  return (
    <AuthFrame variant="roles">
      <AuthIntro title="Create your account" description="Choose the role that matches how you work." />

      <ul className="auth-role-list" aria-label="Account roles">
        {roles.map(({ id, icon: Icon, title, description, href }) => (
          <li key={id}>
            <Link href={href} className={`auth-role-card auth-role-card--${id}`}
              aria-labelledby={`role-${id}-title`} aria-describedby={`role-${id}-description`}>
              <span className="auth-role-icon"><Icon className="size-6" strokeWidth={1.65} aria-hidden /></span>
              <h2 id={`role-${id}-title`}>{title}</h2>
              <p id={`role-${id}-description`}>{description}</p>
              <span className="auth-role-action" aria-hidden>Continue</span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="auth-footer-link">
        Already have an account? <Link href={ROUTES.LOGIN} className="auth-text-link">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
