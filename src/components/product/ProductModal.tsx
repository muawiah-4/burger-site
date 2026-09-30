"use client";

import { RefObject, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Check } from "lucide-react";
import { Product } from "@/types";
import { useProductModal } from "@/context/product-modal-context";
import { useCart } from "@/context/cart-context";
import { useFlyToCart } from "@/context/fly-to-cart-context";
import {
  buildSelectedOptions,
  computeUnitPrice,
  defaultSelection,
  isSelectionComplete,
  SelectionState,
} from "@/lib/cart";
import { formatPrice, cn } from "@/lib/utils";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Button } from "@/components/ui/Button";
import { useDialog } from "@/hooks/useDialog";

export function ProductModal() {
  const { product, close } = useProductModal();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useDialog<HTMLDivElement>(!!product, close);

  return (
    <AnimatePresence>
      {product && (
        <>
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={close}
          />
          <ProductModalPanel
            key={product.id}
            dialogRef={dialogRef}
            product={product}
            close={close}
            shouldReduceMotion={!!shouldReduceMotion}
          />
        </>
      )}
    </AnimatePresence>
  );
}

function ProductModalPanel({
  dialogRef,
  product,
  close,
  shouldReduceMotion,
}: {
  dialogRef: RefObject<HTMLDivElement | null>;
  product: Product;
  close: () => void;
  shouldReduceMotion: boolean;
}) {
  const { addItem } = useCart();
  const { launch } = useFlyToCart();
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<SelectionState>(() => defaultSelection(product.optionGroups));
  const [quantity, setQuantity] = useState(1);

  const unitPrice = useMemo(() => computeUnitPrice(product, selection), [product, selection]);
  const complete = isSelectionComplete(product, selection);

  function toggleChoice(groupId: string, choiceId: string, type: "single" | "multi", max?: number) {
    setSelection((prev) => {
      const current = prev[groupId] ?? [];
      if (type === "single") {
        return { ...prev, [groupId]: [choiceId] };
      }
      const has = current.includes(choiceId);
      if (has) {
        return { ...prev, [groupId]: current.filter((id) => id !== choiceId) };
      }
      if (max && current.length >= max) {
        return prev;
      }
      return { ...prev, [groupId]: [...current, choiceId] };
    });
  }

  function handleAddToCart() {
    if (!complete) return;
    launch(imageWrapRef.current, product.image);
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      category: product.category,
      basePrice: product.price,
      unitPrice,
      quantity,
      selectedOptions: buildSelectedOptions(product, selection),
    });
    close();
  }

  return (
    <motion.div
      key="modal"
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className="fixed inset-x-0 bottom-0 z-50 flex outline-none max-h-[92vh] flex-col overflow-hidden rounded-t-3xl border border-cream/10 bg-charcoal shadow-2xl sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[85vh] sm:w-[880px] sm:flex-row sm:rounded-3xl"
      initial={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
      animate={shouldReduceMotion ? { opacity: 1 } : { y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { y: "100%" }}
      transition={{ duration: shouldReduceMotion ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="focus-ring absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-charcoal-raised/90 text-cream shadow-md transition hover:bg-charcoal-raised"
      >
        <X size={18} />
      </button>

      <div ref={imageWrapRef} className="relative h-52 w-full shrink-0 bg-charcoal-soft sm:h-auto sm:w-2/5">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, 35vw"
          className="object-cover"
          loading="eager"
        />
        {product.badges && product.badges.length > 0 && (
          <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <Badge key={b} type={b} />
            ))}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:w-3/5">
        <div className="flex-1 overflow-y-auto p-6 sm:p-7">
          <h2 id="product-modal-title" className="font-display text-2xl font-extrabold text-cream">
            {product.name}
          </h2>
          <div className="mt-2 flex items-center gap-3">
            <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            <span className="text-xs text-cream/60">·</span>
            <span className="font-display text-sm font-bold text-ember-text">{formatPrice(product.price)} base</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-cream/70">{product.description}</p>

          {product.ingredients.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.ingredients.map((ing) => (
                <span
                  key={ing}
                  className="rounded-full bg-cream/5 px-2.5 py-1 text-[11px] font-medium text-cream/60"
                >
                  {ing}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-6">
            {product.optionGroups.map((group) => (
              <fieldset key={group.id}>
                <legend className="mb-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wider text-cream">
                  {group.label}
                  {group.required && <span className="text-ember-text">*</span>}
                  {group.type === "multi" && group.max && (
                    <span className="font-body text-[11px] font-normal normal-case text-cream/60">
                      choose up to {group.max}
                    </span>
                  )}
                </legend>
                <div className="flex flex-wrap gap-2" role={group.type === "single" ? "radiogroup" : "group"}>
                  {group.choices.map((choice) => {
                    const active = (selection[group.id] ?? []).includes(choice.id);
                    return (
                      <button
                        key={choice.id}
                        type="button"
                        role={group.type === "single" ? "radio" : "checkbox"}
                        aria-checked={active}
                        onClick={() => toggleChoice(group.id, choice.id, group.type, group.max)}
                        className={cn(
                          "focus-ring flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all",
                          active
                            ? "border-ember bg-ember-fill text-cream"
                            : "border-cream/15 bg-charcoal-raised text-cream hover:border-cream/30"
                        )}
                      >
                        {active && <Check size={13} />}
                        {choice.label}
                        {choice.priceDelta > 0 && (
                          <span className={cn("text-[10px]", active ? "text-cream/80" : "text-cream/60")}>
                            +{formatPrice(choice.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-cream/10 bg-charcoal px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:p-4">
          <QuantityStepper quantity={quantity} onChange={setQuantity} className="shrink-0" />
          <Button
            variant="primary"
            size="md"
            className="min-w-0 flex-1 justify-between py-3.5 sm:px-8 sm:py-4 sm:text-base"
            disabled={!complete}
            onClick={handleAddToCart}
          >
            <span className="truncate">{complete ? "Add to Cart" : "Select options"}</span>
            <span className="shrink-0 tabular-nums">{formatPrice(unitPrice * quantity)}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
