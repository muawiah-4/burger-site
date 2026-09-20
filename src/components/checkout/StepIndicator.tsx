import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Delivery", "Your Info", "Address", "Payment", "Review"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2" aria-label="Checkout progress">
      {STEPS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-display font-bold transition-colors",
                done && "bg-ember text-cream",
                active && "bg-charcoal text-cream",
                !done && !active && "bg-cream/10 text-cream/60"
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check size={13} /> : step}
            </div>
            <span
              className={cn(
                "hidden font-display text-[11px] font-bold uppercase tracking-wide sm:inline",
                active ? "text-cream" : "text-cream/60"
              )}
            >
              {label}
            </span>
            {step < STEPS.length && <div className="h-px flex-1 bg-cream/10" />}
          </li>
        );
      })}
    </ol>
  );
}
