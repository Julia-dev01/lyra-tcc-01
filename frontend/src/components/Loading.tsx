export function Loading({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-secondary" role="status">
      {label}
    </div>
  );
}
