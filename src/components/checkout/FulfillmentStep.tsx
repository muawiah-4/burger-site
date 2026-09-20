"use client";

import { Bike, ShoppingBag, Check } from "lucide-react";
import { FulfillmentMethod } from "@/types";
import { cn } from "@/lib/utils";

export function FulfillmentStep({
  value,
  onChange,
}: {
  value: FulfillmentMethod;
  onChange: (v: FulfillmentMethod) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">How do you want it?</h2>
      <p className="mt-1 text-sm text-cream/60">Choose delivery or pickup for this order.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            { id: "delivery", label: "Delivery", desc: "Brought straight to your door.", icon: Bike },
            { id: "pickup", label: "Pickup", desc: "Grab it fresh, skip the wait.", icon: ShoppingBag },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={cn(
                "focus-ring relative flex flex-col items-start gap-3 rounded-3xl border-2 p-6 text-left transition-all active:scale-[0.98]",
                active ? "border-ember bg-ember/5" : "border-cream/10 bg-charcoal-raised hover:border-cream/25"
              )}
            >
              {active && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-ember text-cream">
                  <Check size={13} />
                </span>
              )}
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  active ? "bg-ember text-cream" : "bg-cream/5 text-cream"
                )}
              >
                <Icon size={22} />
              </span>
              <div>
                <p className="font-display text-base font-extrabold text-cream">{opt.label}</p>
                <p className="text-sm text-cream/60">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
