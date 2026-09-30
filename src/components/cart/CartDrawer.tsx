"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { X, Trash2, ShoppingBag, Tag } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { formatPrice } from "@/lib/utils";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useDialog } from "@/hooks/useDialog";

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    totals,
    promoCode,
  } = useCart();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useDialog<HTMLElement>(isOpen, closeCart);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={closeCart}
          />
          <m.aside
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            className="fixed inset-y-0 right-0 z-50 flex outline-none h-full w-full max-w-md flex-col border-l border-cream/10 bg-charcoal shadow-2xl"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-cream/10 p-5">
              <h2 id="cart-drawer-title" className="font-display text-lg font-extrabold text-cream">Your Cart</h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-cream transition hover:bg-cream/5 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <ShoppingBag size={40} className="text-cream/20" />
                <p className="font-display font-bold text-cream">Your cart is empty</p>
                <p className="text-sm text-cream/60">Add something delicious to get started.</p>
                <ButtonLink href="/menu" variant="secondary" size="sm" onClick={closeCart} className="mt-2">
                  Browse Menu
                </ButtonLink>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5">
                  <ul className="flex flex-col gap-4">
                    {items.map((item) => (
                      <li key={item.cartItemId} className="flex gap-3 border-b border-cream/5 pb-4">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-charcoal-soft">
                          <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-display text-sm font-bold leading-tight text-cream">
                              {item.name}
                            </p>
                            <button
                              type="button"
                              aria-label={`Remove ${item.name}`}
                              onClick={() => removeItem(item.cartItemId)}
                              className="focus-ring shrink-0 text-cream/60 transition active:scale-90 hover:text-ember-text"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          {item.selectedOptions.length > 0 && (
                            <ul className="text-[11px] leading-relaxed text-cream/60">
                              {item.selectedOptions.map((o) => (
                                <li key={o.groupId}>
                                  <span className="font-semibold text-cream/70">{o.groupLabel}:</span>{" "}
                                  {o.choiceLabels.join(", ")}
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-1 flex items-center justify-between">
                            <QuantityStepper
                              size="sm"
                              quantity={item.quantity}
                              onChange={(q) => updateQuantity(item.cartItemId, q)}
                            />
                            <span className="font-display text-sm font-bold text-cream">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-cream/10 p-5">
                  {/* Remount when the stored code changes (hydration from storage, apply, clear)
                      so the input always starts from the current value. */}
                  <PromoForm key={promoCode} />

                  <div className="mt-3 flex flex-col gap-1.5 text-sm">
                    <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
                    <Row
                      label="Delivery fee"
                      value={totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)}
                    />
                    {totals.discount > 0 && (
                      <Row label="Discount" value={`-${formatPrice(totals.discount)}`} accent />
                    )}
                    <Row label="Tax" value={formatPrice(totals.tax)} />
                    <div className="mt-1 flex items-center justify-between border-t border-cream/10 pt-2 font-display text-base font-extrabold text-cream">
                      <span>Total</span>
                      <span>{formatPrice(totals.total)}</span>
                    </div>
                  </div>

                  <ButtonLink href="/checkout" onClick={closeCart} variant="primary" size="lg" className="mt-4 w-full">
                    Checkout
                  </ButtonLink>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="focus-ring mt-3 w-full text-center text-xs font-semibold uppercase tracking-wide text-cream/60 hover:text-cream"
                  >
                    Continue Shopping
                  </button>
                </div>
              </>
            )}
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function PromoForm() {
  const { promoCode, promoMessage, promoValid, applyPromo, clearPromo } = useCart();
  const [promoInput, setPromoInput] = useState(promoCode);

  return (
    <>
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/60" />
          <input
            value={promoInput}
            onChange={(e) => setPromoInput(e.target.value)}
            placeholder="ENTER PROMO CODE"
            className="focus-ring w-full rounded-full border border-cream/15 bg-charcoal-raised py-2.5 pl-9 pr-3 text-xs font-semibold uppercase tracking-wide text-cream placeholder:text-cream/60"
            aria-label="Promo code"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={() => applyPromo(promoInput)}>
          Apply
        </Button>
      </div>
      {promoMessage && (
        <p className={cnMsg(promoValid)}>
          {promoValid ? "✓ " : ""}
          {promoMessage}
          {promoValid && (
            <button
              type="button"
              onClick={clearPromo}
              className="focus-ring ml-2 underline"
            >
              remove
            </button>
          )}
        </p>
      )}
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-cream/60">
      <span>{label}</span>
      <span className={accent ? "font-semibold text-ember-text" : "text-cream"}>{value}</span>
    </div>
  );
}

function cnMsg(valid: boolean) {
  return valid ? "mb-3 text-xs font-semibold text-emerald-400" : "mb-3 text-xs font-semibold text-ember-text";
}
