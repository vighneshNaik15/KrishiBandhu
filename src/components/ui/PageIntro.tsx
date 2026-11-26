import type { ReactNode } from 'react';

interface PageIntroProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  tone?: 'light' | 'forest' | 'photo';
  className?: string;
}

export function PageIntro({ title, description, eyebrow, icon, actions, tone = 'light', className = '' }: PageIntroProps) {
  return (
    <header className={`page-intro ${tone !== 'light' ? 'theme-forest' : ''} ${tone === 'photo' ? 'page-intro-photo' : ''} ${className}`}>
      <div className="page-intro-content">
        {(eyebrow || icon) && (
          <div className="page-intro-label">
            {icon && <span className="page-intro-icon" aria-hidden>{icon}</span>}
            {eyebrow && <span>{eyebrow}</span>}
          </div>
        )}
        <h1>{title}</h1>
        {description && <p className="page-intro-description">{description}</p>}
      </div>
      {actions && <div className="page-intro-actions">{actions}</div>}
    </header>
  );
}
