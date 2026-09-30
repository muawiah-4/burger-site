import { Loader2 } from "lucide-react";

/** Full-page placeholder for client pages waiting on localStorage (cart, orders). */
export function PageLoading({ label }: { label: string }) {
  return (
    <div role="status" className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-5 pt-28 text-center">
      <Loader2 size={28} aria-hidden="true" className="animate-spin text-ember-text motion-reduce:animate-none" />
      <p className="font-display text-sm font-bold text-cream/60">{label}</p>
    </div>
  );
}
