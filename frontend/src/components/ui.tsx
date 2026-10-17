import { Link } from "react-router-dom";

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-forest-600">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-forest-200 border-t-forest-600" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: { to: string; label: string } }) {
  return (
    <div className="card mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-2xl">🥀</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {hint && <p className="mt-2 text-sm text-forest-700/70">{hint}</p>}
      {action && (
        <Link to={action.to} className="btn-primary mt-6">{action.label}</Link>
      )}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center">
      <p className="font-medium text-red-700">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-4" onClick={onRetry}>Try again</button>
      )}
    </div>
  );
}

export function IssueBanner({ issues }: { issues: string[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="rounded-xl border border-marigold-400/40 bg-marigold-400/10 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-marigold-600">Needs your attention</p>
      <ul className="mt-1 space-y-0.5 text-sm text-forest-800">
        {issues.map((i, idx) => <li key={idx}>• {i}</li>)}
      </ul>
    </div>
  );
}

export function QtyStepper({ value, min = 1, max, onChange, disabled }: {
  value: number; min?: number; max: number; onChange: (v: number) => void; disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-cream-300 bg-white">
      <button
        className="px-3 py-1.5 text-forest-700 disabled:opacity-30"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease quantity"
      >−</button>
      <span className="min-w-8 text-center text-sm font-semibold">{value}</span>
      <button
        className="px-3 py-1.5 text-forest-700 disabled:opacity-30"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase quantity"
      >+</button>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl text-forest-800">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-forest-700/70">{subtitle}</p>}
    </div>
  );
}
