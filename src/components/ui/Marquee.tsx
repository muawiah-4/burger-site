"use client";

import { useReducedMotion } from "motion/react";

export function Marquee({ items }: { items: string[] }) {
  const shouldReduceMotion = useReducedMotion();
  const content = (
    <>
      {items.map((item, i) => (
        <span key={i} className="mx-4 inline-flex items-center gap-4">
          {item}
          <span aria-hidden="true" className="text-charcoal/40">
            ✦
          </span>
        </span>
      ))}
    </>
  );

  return (
    <div className="overflow-hidden bg-gold py-3" role="marquee" aria-label="Ember brand promise">
      <div
        className={shouldReduceMotion ? "flex flex-nowrap" : "flex w-max flex-nowrap animate-marquee"}
        style={shouldReduceMotion ? { flexWrap: "wrap" } : undefined}
      >
        <div className="flex shrink-0 font-display text-xs font-bold uppercase tracking-widest text-charcoal">
          {content}
        </div>
        {!shouldReduceMotion && (
          <div aria-hidden="true" className="flex shrink-0 font-display text-xs font-bold uppercase tracking-widest text-charcoal">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
