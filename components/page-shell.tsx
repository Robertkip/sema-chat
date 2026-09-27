export function PageShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {lede && <p className="mt-2 max-w-prose text-ink-muted">{lede}</p>}
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

export function Placeholder({ ships }: { ships: string }) {
  return (
    <div className="rounded-panel border border-dashed border-line bg-surface-raised p-6">
      <p className="text-sm text-ink-muted">
        Placeholder screen. The real implementation ships in{" "}
        <span className="font-medium text-ink">{ships}</span>.
      </p>
    </div>
  );
}
