import type { ReactNode } from 'react';

export function NoticeCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="notice-card">
      <h2 className="mb-1 text-sm font-bold text-primary">{title}</h2>
      <div className="text-sm leading-relaxed text-primary">{children}</div>
    </aside>
  );
}
