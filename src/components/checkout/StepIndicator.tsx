import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Delivery", "Your Info", "Address", "Payment", "Review"];

export function StepIndicator({ current }: { current: number }) {
  const currentLabel = STEPS[current - 1];
  return (
    <div>
      <ol className="flex items-center gap-1 sm:gap-2" aria-label="Checkout progress">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              className="flex flex-1 items-center gap-1 sm:gap-2"
              aria-current={active ? "step" : undefined}
            >
              <div
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-display font-bold transition-colors",
                  done && "bg-ember/20 text-ember-text",
                  active && "bg-cream text-charcoal ring-4 ring-ember/30",
                  !done && !active && "bg-cream/10 text-cream/60"
                )}
              >
                {done ? <Check size={13} strokeWidth={3} /> : step}
              </div>
              <span
                className={cn(
                  "sr-only font-display text-[11px] font-bold uppercase tracking-wide sm:not-sr-only",
                  active ? "text-cream" : "text-cream/60"
                )}
              >
                {label}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
              {step < STEPS.length && (
                <div aria-hidden="true" className={cn("h-px flex-1", done ? "bg-ember/40" : "bg-cream/10")} />
              )}
            </li>
          );
        })}
      </ol>
      {/* Labels don't fit beside the circles on phones; name the current step instead.
          Hidden from AT because the list above already exposes it via aria-current. */}
      <p aria-hidden="true" className="mt-3 font-display text-xs font-bold uppercase tracking-wide text-cream/60 sm:hidden">
        Step {current} of {STEPS.length} · <span className="text-cream">{currentLabel}</span>
      </p>
    </div>
  );
}
