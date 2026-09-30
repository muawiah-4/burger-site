"use client";

import Link from "next/link";
import { Bike, ShoppingBag, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartActions, useCartState } from "@/context/cart-context";
import { categories } from "@/lib/data/categories";

export function OrderingBar() {
  const { fulfillment } = useCartState();
  const { setFulfillment } = useCartActions();

  return (
    <section className="relative z-10 -mt-8 px-5 sm:-mt-10 sm:px-8">
      <div className="mx-auto max-w-5xl rounded-3xl border border-cream/10 bg-charcoal-raised p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] sm:p-6">
        <div className="flex items-center justify-center gap-2 rounded-full bg-charcoal-soft p-1.5">
          {(["delivery", "pickup"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFulfillment(mode)}
              aria-pressed={fulfillment === mode}
              className={cn(
                "focus-ring flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 font-display text-xs font-bold uppercase tracking-wider transition-all active:scale-95",
                fulfillment === mode ? "bg-charcoal text-cream shadow-md" : "text-cream/60 hover:text-cream"
              )}
            >
              {mode === "delivery" ? <Bike size={15} /> : <ShoppingBag size={15} />}
              {mode}
            </button>
          ))}
        </div>

        <p className="mt-5 text-center font-display text-sm font-bold uppercase tracking-wider text-cream/70">
          What are you craving?
        </p>

        <div className="mt-4 flex gap-2.5 overflow-x-auto scrollbar-none pb-1 sm:justify-center sm:overflow-visible sm:flex-wrap">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/menu?category=${cat.id}`}
              className="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-cream/10 bg-charcoal-raised px-4 py-2 text-xs font-bold text-cream transition-colors hover:border-ember hover:text-ember-text"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            href="/menu?category=deals"
            className="focus-ring flex shrink-0 items-center gap-1.5 rounded-full border border-ember/30 bg-ember/10 px-4 py-2 text-xs font-bold text-ember-text transition-colors hover:bg-ember-fill hover:text-cream"
          >
            <Flame size={13} className="fill-current" />
            Deals
          </Link>
        </div>
      </div>
    </section>
  );
}
