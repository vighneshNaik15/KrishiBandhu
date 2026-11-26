import Image from 'next/image';
import Link from 'next/link';
import { Sprout } from 'lucide-react';
import { APP_NAME, ROUTES } from '@/lib/constants';

interface BrandProps {
  href?: string;
  onClick?: () => void;
  showLogo?: boolean;
}

export function Brand({ href = ROUTES.HOME, onClick, showLogo = false }: BrandProps) {
  return (
    <Link href={href} onClick={onClick} className="brand">
      {showLogo ? (
        <span className="grid size-[3.25rem] shrink-0 place-items-center rounded-lg bg-white ring-1 ring-forest/10">
          <Image src="/images/krishibandhu-logo.png" alt="" width={44} height={44} className="object-contain" />
        </span>
      ) : (
        <span className="brand-mark"><Sprout aria-hidden className="size-5" strokeWidth={1.8} /></span>
      )}
      <span>{APP_NAME}</span>
    </Link>
  );
}
