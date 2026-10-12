import { CheckCircle2, X } from 'lucide-react';

export function SuccessBanner({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  if (!show) return null;
  return (
    <div className="rise-in flex items-start gap-3 rounded-xl border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.1)] px-4 py-3.5 text-sm text-[hsl(var(--foreground))] shadow-[0_10px_30px_hsl(var(--primary)/.08)]" role="status" data-testid="banner-saved">
      <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-[hsl(var(--primary))]" />
      <div className="flex-1 text-sm leading-6">
        <span className="font-bold text-[hsl(var(--primary))]">Saved.</span>{' '}
        <span className="text-[hsl(var(--muted-foreground))]">Public journal uses the new content on refresh.</span>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="rounded-md p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]">
        <X className="size-4" />
      </button>
    </div>
  );
}