"use client";

export function Marquee({ items }: { items: string[] }) {
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
      {/* Both copies always render (server and client agree); reduced motion is handled in CSS:
          no animation, the duplicate is hidden and the items wrap instead of scrolling. */}
      <div className="flex w-max flex-nowrap motion-safe:animate-marquee motion-reduce:w-auto">
        <div className="flex shrink-0 font-display text-xs font-bold uppercase tracking-widest text-charcoal motion-reduce:shrink motion-reduce:flex-wrap">
          {content}
        </div>
        <div aria-hidden="true" className="flex shrink-0 font-display text-xs font-bold uppercase tracking-widest text-charcoal motion-reduce:hidden">
          {content}
        </div>
      </div>
    </div>
  );
}
