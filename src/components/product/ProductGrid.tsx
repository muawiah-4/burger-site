"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Product } from "@/types";
import { ProductCard } from "./ProductCard";
import { LayoutMotion } from "@/components/providers/LayoutMotion";

export function ProductGrid({
  products,
  emptyMessage = "No items match your search.",
  preloadCount = 0,
}: {
  products: Product[];
  emptyMessage?: string;
  /** How many leading card images to preload — only for above-the-fold grids (the /menu page). */
  preloadCount?: number;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-cream/15 py-20 text-center">
        <p className="font-display text-lg font-bold text-cream">Nothing here yet.</p>
        <p className="text-sm text-cream/60">{emptyMessage}</p>
      </div>
    );
  }

  return (
    // Cards reflow with layout animations when filters change: needs domMax.
    <LayoutMotion>
      <m.div
        layout
        // popLayout pops exiting cards out with position:absolute; they're placed
        // relative to this grid.
        className="relative grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4"
      >
        <AnimatePresence mode="popLayout">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} preload={i < preloadCount} index={i} />
          ))}
        </AnimatePresence>
      </m.div>
    </LayoutMotion>
  );
}
