"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, useAnimationControls, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Check, ShoppingBag, X } from "lucide-react";
import { useCartActions, useCartState, useLastAdded } from "@/context/cart-context";
import { useLandSignal } from "@/context/fly-to-cart-context";
import { formatPrice } from "@/lib/utils";

const TOAST_MS = 4000;

/**
 * Add-to-cart feedback that doesn't take over the page: a toast ("Added · View cart")
 * announced through an always-mounted live region, and on phones a sticky
 * "View cart (n) · $X" bar while the cart has items (never on checkout).
 */
export function CartFeedback() {
  const pathname = usePathname();
  const { itemCount, totals, hydrated } = useCartState();
  const showBar = hydrated && itemCount > 0 && !pathname.startsWith("/checkout");

  useEffect(() => {
    // The mascot reads this to sit above the bar instead of under it.
    const root = document.documentElement;
    if (showBar) root.style.setProperty("--cart-bar-h", "4.5rem");
    else root.style.removeProperty("--cart-bar-h");
    return () => {
      root.style.removeProperty("--cart-bar-h");
    };
  }, [showBar]);

  return (
    <>
      <AddedToast raised={showBar} />
      {showBar && (
        <>
          {/* Keeps the footer's last lines scrollable above the fixed bar. */}
          <div aria-hidden="true" className="h-20 lg:hidden" />
          <MobileCartBar count={itemCount} subtotal={totals.subtotal} />
        </>
      )}
    </>
  );
}

function AddedToast({ raised }: { raised: boolean }) {
  const lastAdded = useLastAdded();
  const { openCart } = useCartActions();
  const shouldReduceMotion = useReducedMotion();
  const [visibleId, setVisibleId] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (lastAdded) setVisibleId(lastAdded.id);
  }, [lastAdded]);

  useEffect(() => {
    if (visibleId === null || paused) return;
    const t = window.setTimeout(() => setVisibleId(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [visibleId, paused]);

  const show = lastAdded !== null && visibleId === lastAdded.id;
  const label = lastAdded ? `${lastAdded.quantity > 1 ? `${lastAdded.quantity}× ` : ""}${lastAdded.name}` : "";

  return (
    <>
      {/* Always mounted so screen readers pick up each change. */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {show ? `Added ${label} to your cart.` : ""}
      </p>
      <AnimatePresence>
        {show && (
          <m.div
            key={lastAdded.id}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            data-testid="cart-toast"
            className={
              "fixed inset-x-3 z-[45] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-cream/15 bg-charcoal-raised/95 p-3 pl-4 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur " +
              (raised
                ? "bottom-[calc(env(safe-area-inset-bottom,0px)+5.25rem)]"
                : "bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)]") +
              " lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-20"
            }
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember-fill text-cream">
              <Check size={14} />
            </span>
            <p className="min-w-0 flex-1 text-sm text-cream">
              <span className="font-display font-bold">Added</span>
              <span className="block truncate text-xs text-cream/60">{label}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setVisibleId(null);
                openCart();
              }}
              className="focus-ring shrink-0 rounded-full bg-cream px-3.5 py-2 font-display text-xs font-bold uppercase tracking-wide text-charcoal transition active:scale-95"
            >
              View cart
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setVisibleId(null)}
              className="focus-ring shrink-0 rounded-full p-1 text-cream/60 hover:text-cream"
            >
              <X size={14} />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MobileCartBar({ count, subtotal }: { count: number; subtotal: number }) {
  const { openCart } = useCartActions();
  const landSignal = useLandSignal();
  const lastAdded = useLastAdded();
  const controls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion || (landSignal === 0 && !lastAdded)) return;
    controls.start({ scale: [1, 1.35, 1] }, { duration: 0.4, ease: "easeOut" });
  }, [landSignal, lastAdded, controls, shouldReduceMotion]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream/10 bg-charcoal/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <button
        type="button"
        onClick={openCart}
        data-testid="mobile-cart-bar"
        className="focus-ring mx-auto flex w-full max-w-xl items-center justify-between gap-3 rounded-full bg-ember-fill px-5 py-3 font-display text-sm font-bold uppercase tracking-wide text-cream active:scale-[0.99]"
      >
        <span className="flex items-center gap-2">
          <ShoppingBag size={17} />
          View cart
          <m.span
            animate={controls}
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-cream px-1.5 text-[11px] text-charcoal"
          >
            {count}
          </m.span>
        </span>
        <span className="tabular-nums">{formatPrice(subtotal)}</span>
      </button>
    </div>
  );
}
