/* ─────────────────────────────────────────────
 *  LoadingOverlay — spinner + status text
 * ───────────────────────────────────────────── */

interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = "Loading…" }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col items-center justify-center gap-5 bg-[#0a0e17]/95">
      <div className="h-12 w-12 rounded-full border-[3px] border-white/10 border-t-accent animate-spin" />
      <p className="font-mono text-sm text-dim">{message}</p>
    </div>
  );
}
