import Image from "next/image";
import { deals } from "@/lib/data/deals";
import { formatPrice } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { buildDealCartItem } from "@/lib/cart";
import { ComboSection } from "./ComboSection";

// These two are sold through the combo builder above the grid, so they are not repeated as cards.
const BUILDER_DEAL_IDS = new Set(["deal-burger-fries-drink", "deal-pizza-drink"]);
const gridDeals = deals.filter((d) => !BUILDER_DEAL_IDS.has(d.id));

export function DealsSection() {
  return (
    <section className="bg-charcoal py-14 sm:py-24" id="deals">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          label="Deals & combos"
          title="More Food, Less Money"
          description="Build a combo your way, or grab a bundle for the table. Prices already include the savings."
        />
        <div className="mt-10">
          <ComboSection />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {gridDeals.map((deal, i) => {
            const savings = Math.round((deal.originalPrice - deal.price) * 100) / 100;
            return (
              <Reveal
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.4,
                  delay: (i % 3) * 0.08,
                }}
                className="flex flex-col overflow-hidden rounded-3xl bg-charcoal-soft ring-1 ring-cream/5"
              >
                <div className="relative aspect-[16/10] w-full">
                  <Image src={deal.image} alt={deal.name} fill sizes="(min-width: 1280px) 392px, (min-width: 1024px) calc((100vw - 104px) / 3), (min-width: 640px) calc((100vw - 84px) / 2), calc(100vw - 40px)" className="object-cover" />
                  <div className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[11px] font-display font-bold uppercase tracking-wide text-charcoal">
                    Save {formatPrice(savings)}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-extrabold text-cream">{deal.name}</h3>
                  <p className="mt-1 text-sm text-cream/70">{deal.description}</p>
                  <ul className="mt-3 flex flex-col gap-1">
                    {deal.includes.map((inc) => (
                      <li key={inc} className="text-xs text-cream/60">
                        · {inc}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-end gap-2 pt-5">
                    <span className="font-display text-2xl font-extrabold text-cream">
                      {formatPrice(deal.price)}
                    </span>
                    <span className="pb-0.5 text-sm text-cream/60 line-through">
                      {formatPrice(deal.originalPrice)}
                    </span>
                  </div>
                  <AddToCartButton item={buildDealCartItem(deal)} variant="primary" size="md" className="mt-4 w-full">
                    {deal.ctaLabel}
                  </AddToCartButton>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
