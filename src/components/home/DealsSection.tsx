"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { deals } from "@/lib/data/deals";
import { formatPrice } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/context/cart-context";
import { buildDealCartItem } from "@/lib/cart";

export function DealsSection() {
  const { addItem, openCart } = useCart();

  function addDeal(dealId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    addItem(buildDealCartItem(deal));
    openCart();
  }

  return (
    <section className="bg-charcoal py-20 sm:py-28" id="deals">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading label="Limited Time" title="Deals Worth Craving" />
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal, i) => {
            const savings = Math.round((deal.originalPrice - deal.price) * 100) / 100;
            return (
              <motion.div
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
                  <Image src={deal.image} alt={deal.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                  <div className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[11px] font-display font-bold uppercase tracking-wide text-charcoal">
                    Save {formatPrice(savings)}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-lg font-extrabold text-cream">{deal.name}</h3>
                  <p className="mt-1 text-sm text-cream/60">{deal.description}</p>
                  <ul className="mt-3 flex flex-col gap-1">
                    {deal.includes.map((inc) => (
                      <li key={inc} className="text-xs text-cream/50">
                        · {inc}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="font-display text-2xl font-extrabold text-cream">
                      {formatPrice(deal.price)}
                    </span>
                    <span className="pb-0.5 text-sm text-cream/40 line-through">
                      {formatPrice(deal.originalPrice)}
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    className="mt-4 w-full"
                    onClick={() => addDeal(deal.id)}
                  >
                    {deal.ctaLabel}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
