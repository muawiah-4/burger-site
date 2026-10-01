"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import * as m from "motion/react-m";
import { Deal } from "@/types";
import { formatPrice, cn } from "@/lib/utils";
import { DEAL_PRODUCT_PREFIX } from "@/lib/cart";
import { Button } from "@/components/ui/Button";
import { useCartActions } from "@/context/cart-context";
import { useFlyToCartActions } from "@/context/fly-to-cart-context";

/** The slice of a product the combo builder needs; the server passes only these. */
export interface ComboChoice {
  id: string;
  name: string;
  image: string;
}

function PillGroup({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: ComboChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-wide text-cream/60">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-pressed={active}
              className={cn(
                "focus-ring rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "border-ember bg-ember-fill text-cream"
                  : "border-cream/15 bg-charcoal-raised text-cream hover:border-cream/30"
              )}
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ComboCard({
  deal,
  badgeLabel,
  heading,
  itemLabel,
  items,
  drinks,
  extraInclude,
  gallery,
  category,
  reverse,
}: {
  deal: Deal;
  badgeLabel: string;
  heading: React.ReactNode;
  itemLabel: string;
  items: ComboChoice[];
  drinks: ComboChoice[];
  extraInclude?: { groupId: string; groupLabel: string; label: string };
  gallery: [string, string, string];
  category: "burgers" | "pizza";
  reverse?: boolean;
}) {
  const { addItem } = useCartActions();
  const { launch } = useFlyToCartActions();
  const galleryRef = useRef<HTMLDivElement>(null);
  const [itemId, setItemId] = useState(items[0].id);
  const [drinkId, setDrinkId] = useState(drinks[0].id);

  const selectedItem = items.find((i) => i.id === itemId);
  const selectedDrink = drinks.find((d) => d.id === drinkId);

  if (!selectedItem || !selectedDrink) return null;

  function buildCombo() {
    if (!selectedItem || !selectedDrink) return;
    const options = [
      { groupId: "main", groupLabel: itemLabel, choiceIds: [itemId], choiceLabels: [selectedItem.name], priceDelta: 0 },
      ...(extraInclude
        ? [{ groupId: extraInclude.groupId, groupLabel: extraInclude.groupLabel, choiceIds: [extraInclude.groupId], choiceLabels: [extraInclude.label], priceDelta: 0 }]
        : []),
      { groupId: "drink", groupLabel: "Drink", choiceIds: [drinkId], choiceLabels: [selectedDrink.name], priceDelta: 0 },
    ];

    launch(galleryRef.current, selectedItem.image);
    addItem({
      productId: `${DEAL_PRODUCT_PREFIX}${deal.id}`,
      slug: deal.slug,
      name: deal.name,
      image: selectedItem.image,
      category,
      basePrice: deal.price,
      unitPrice: deal.price,
      quantity: 1,
      selectedOptions: options,
    });
  }

  return (
    <div className="grid grid-cols-1 items-center gap-10 rounded-[2.5rem] border border-cream/10 bg-charcoal-soft p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-4">
      <m.div
        initial={{ opacity: 0, x: reverse ? 20 : -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn(reverse ? "lg:order-2" : "order-2 lg:order-1")}
      >
        <span className="inline-block rounded-full bg-gold px-3 py-1 text-[11px] font-display font-bold uppercase tracking-wide text-charcoal">
          {badgeLabel}
        </span>
        <h2 className="mt-4 font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-cream sm:text-5xl">
          {heading}
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/60">{deal.description}</p>

        <div className="mt-6 flex flex-col gap-5">
          <PillGroup label={`Choose your ${itemLabel.toLowerCase()}`} items={items} selectedId={itemId} onSelect={setItemId} />
          <PillGroup label="Choose your soft drink" items={drinks} selectedId={drinkId} onSelect={setDrinkId} />
        </div>

        <div className="mt-6 flex items-end gap-2">
          <span className="font-display text-3xl font-extrabold text-cream">{formatPrice(deal.price)}</span>
          <span className="pb-1 text-base text-cream/60 line-through">{formatPrice(deal.originalPrice)}</span>
        </div>
        <Button variant="primary" size="lg" className="mt-6" onClick={buildCombo}>
          {deal.ctaLabel}
        </Button>
      </m.div>

      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn("grid grid-cols-2 gap-3", reverse ? "lg:order-1" : "order-1 lg:order-2")}
      >
        <div ref={galleryRef} className="relative col-span-2 aspect-[16/10] overflow-hidden rounded-3xl">
          <Image src={gallery[0]} alt={selectedItem.name} fill sizes="(min-width: 1280px) 504px, (min-width: 1024px) calc((100vw - 160px) * 0.45), (min-width: 640px) calc(100vw - 144px), calc(100vw - 88px)" className="object-cover" />
        </div>
        <div className="relative aspect-square overflow-hidden rounded-3xl">
          <Image src={gallery[1]} alt="Side" fill sizes="(min-width: 1280px) 246px, (min-width: 1024px) calc((100vw - 160px) * 0.225), (min-width: 640px) calc(50vw - 78px), calc(50vw - 50px)" className="object-cover" />
        </div>
        <div className="relative aspect-square overflow-hidden rounded-3xl">
          <Image src={gallery[2]} alt={selectedDrink.name} fill sizes="(min-width: 1280px) 246px, (min-width: 1024px) calc((100vw - 160px) * 0.225), (min-width: 640px) calc(50vw - 78px), calc(50vw - 50px)" className="object-cover" />
        </div>
      </m.div>
    </div>
  );
}

