import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { ROUTES } from '@/lib/constants';

type AuthVariant = 'split' | 'roles' | 'registration';

export function AuthFrame({ children, variant = 'split' }: { children: ReactNode; variant?: AuthVariant }) {
  return (
    <div className={`auth-frame auth-frame--${variant}`}>
      <main className="auth-main">
        <div className="auth-body">
          <div className="auth-brand-row">
            <Link href={ROUTES.HOME} className="auth-logo" aria-label="KrishiBandhu home">
              <Image src="/images/krishibandhu-logo.png" width={104} height={104} alt="" />
            </Link>
            {variant === 'registration' && (
              <Link href={ROUTES.REGISTER} className="auth-text-link auth-role-back">Change role</Link>
            )}
          </div>
          {children}
        </div>
      </main>
      {variant !== 'roles' && (
        <aside className="auth-story" aria-label="About KrishiBandhu">
          <Image
            src="/images/konkan-rice-fields.webp"
            alt=""
            fill
            loading="eager"
            sizes="(min-width: 64rem) 47vw, 100vw"
            className="auth-story-image"
          />
          <div className="auth-story-copy">
            <p className="auth-story-region"><MapPin aria-hidden className="size-4" /> Goa &amp; the Konkan coast</p>
            <p className="auth-story-title">Good work grows <em>together.</em></p>
            <p>Find the people and tools you need for the work ahead.</p>
          </div>
        </aside>
      )}
    </div>
  );
}

export function AuthIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="auth-intro">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

export function RegistrationFrame({ title, description, children }: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <AuthFrame variant="registration">
      <AuthIntro title={title} description={description} />
      {children}
      <p className="auth-footer-link">
        Already have an account? <Link href={ROUTES.LOGIN} className="auth-text-link">Sign in</Link>
      </p>
    </AuthFrame>
  );
}
