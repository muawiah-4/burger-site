import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Persistent disclosure that checkout and order tracking are simulated. Ember is a
 * static demo with no backend: nothing is charged, sent to a kitchen or delivered.
 */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-left text-sm text-cream",
        className
      )}
    >
      <Info size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
      <span>
        <strong className="font-display font-bold text-gold">Demo:</strong> no payment is taken and no food is
        prepared. Ember is a fictional brand.
      </span>
    </p>
  );
}
