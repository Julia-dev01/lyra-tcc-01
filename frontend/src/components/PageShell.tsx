import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { HeroHeader } from './HeroHeader';

interface PageShellProps {
  title: string;
  subtitle?: string;
  icon?: 'heart' | 'alert';
  right?: ReactNode;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
}

export function PageShell({
  title,
  subtitle,
  icon,
  right,
  backTo,
  backLabel = 'Voltar',
  children,
  wide,
  footer,
}: PageShellProps) {
  return (
    <div className={`mx-auto min-h-screen ${wide ? 'max-w-5xl' : 'max-w-md sm:max-w-lg'} pb-20`}>
      <HeroHeader title={title} subtitle={subtitle} icon={icon} right={right} />
      <div className="px-4 pt-5 sm:px-6">
        {backTo && (
          <Link to={backTo} className="btn-ghost mb-4 inline-flex gap-2 text-sm">
            <ArrowLeft size={16} aria-hidden />
            {backLabel}
          </Link>
        )}
        {children}
        {footer}
      </div>
    </div>
  );
}
