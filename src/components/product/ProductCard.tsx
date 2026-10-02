"use client";

import { memo } from "react";
import Image from "next/image";
import * as m from "motion/react-m";
import { Plus } from "lucide-react";
import { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { RatingStars } from "@/components/ui/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { useProductModalActions } from "@/context/product-modal-context";

// Memoised: grids re-render on every filter keystroke, but a card only changes
// when its own product/preload/index props do. `ref` is a plain prop in React 19;
// AnimatePresence mode="popLayout" passes one to measure the exiting card.
export const ProductCard = memo(function ProductCard({
  ref,
  product,
  preload = false,
  index = 0,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  product: Product;
  /** Preload the image in <head> (Next 16 replacement for the deprecated `priority`). */
  preload?: boolean;
  index?: number;
}) {
  const { open } = useProductModalActions();
  const primaryBadge = product.badges?.[0];

  return (
    <m.button
      ref={ref}
      layout
      type="button"
      onClick={() => open(product)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.35,
        delay: (index % 4) * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="focus-ring group flex flex-col overflow-hidden rounded-3xl border border-cream/10 bg-charcoal-raised text-left transition-all hover:-translate-y-0.5 hover:border-cream/25 hover:shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
      aria-label={`View ${product.name}, ${formatPrice(product.price)}, ${product.calories} calories`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal-soft">
        <Image
          src={product.image}
          alt={product.name}
          fill
          // Matches the grid: 2 cols, 3 from md, 4 from lg, capped by the 1280px container.
          sizes="(min-width: 1280px) 274px, (min-width: 1024px) calc((100vw - 124px) / 4), (min-width: 768px) calc((100vw - 104px) / 3), calc((100vw - 52px) / 2)"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          preload={preload}
        />
        {primaryBadge && (
          <div className="absolute left-3 top-3">
            <Badge type={primaryBadge} />
          </div>
        )}
        <div className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-charcoal text-cream shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:bg-ember">
          <Plus size={18} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-bold leading-tight text-cream">{product.name}</h3>
          <span className="shrink-0 pt-0.5 text-[10px] font-semibold tabular-nums text-cream/60">
            {product.calories} cal
          </span>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-cream/60">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
          <span className="font-display text-sm font-extrabold text-cream">
            {formatPrice(product.price)}
          </span>
        </div>
      </div>
    </m.button>
  );
});
