import type { ReactNode } from 'react';
import { Heart, ShieldAlert } from 'lucide-react';

interface HeroHeaderProps {
  title: string;
  subtitle?: string;
  icon?: 'heart' | 'alert';
  right?: ReactNode;
}

export function HeroHeader({ title, subtitle, icon = 'heart', right }: HeroHeaderProps) {
  const Icon = icon === 'alert' ? ShieldAlert : Heart;
  return (
    <header className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-primary to-secondary px-5 pb-8 pt-[4.5rem] text-white shadow-soft">
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20" aria-hidden>
            <Icon size={24} />
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-[18rem] text-sm text-white/90 sm:max-w-none">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}
