"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_ITEM_QUANTITY } from "@/lib/cart";

export function QuantityStepper({
  quantity,
  onChange,
  min = 1,
  max = MAX_ITEM_QUANTITY,
  size = "md",
  className,
}: {
  quantity: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className={cn("flex items-center gap-3 rounded-full border border-cream/15 px-1", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= min}
        onClick={() => onChange(Math.max(min, quantity - 1))}
        className={cn(
          dim,
          "focus-ring flex items-center justify-center rounded-full text-cream transition hover:bg-cream/5 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
        )}
      >
        <Minus size={16} />
      </button>
      <span className="w-5 text-center font-display text-sm font-bold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={quantity >= max}
        onClick={() => onChange(Math.min(max, quantity + 1))}
        className={cn(
          dim,
          "focus-ring flex items-center justify-center rounded-full text-cream transition hover:bg-cream/5 active:scale-90 disabled:opacity-30 disabled:active:scale-100"
        )}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
