"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChefHat, Flame, Bike, ShoppingBag, PartyPopper, Check } from "lucide-react";
import { PlacedOrder } from "@/types";
import { deriveStatus } from "@/lib/orders";
import { cn } from "@/lib/utils";

const DELIVERY_STAGES = [
  { id: "preparing", label: "Preparing", icon: ChefHat },
  { id: "cooking", label: "Cooking", icon: Flame },
  { id: "on-the-way", label: "On the Way", icon: Bike },
  { id: "delivered", label: "Delivered", icon: PartyPopper },
] as const;

const PICKUP_STAGES = [
  { id: "preparing", label: "Preparing", icon: ChefHat },
  { id: "cooking", label: "Cooking", icon: Flame },
  { id: "ready", label: "Ready", icon: ShoppingBag },
  { id: "delivered", label: "Picked Up", icon: PartyPopper },
] as const;

export function OrderProgress({ order }: { order: PlacedOrder }) {
  const [tick, setTick] = useState(0);
  const { status, progress } = deriveStatus(order);
  // "delivered" is terminal (also covers picked-up pickup orders) — stop re-deriving.
  const isComplete = status === "delivered";

  useEffect(() => {
    if (isComplete) return;
    const interval = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [isComplete]);

  const stages = order.fulfillment === "pickup" ? PICKUP_STAGES : DELIVERY_STAGES;
  const activeIndex = stages.findIndex((s) => s.id === status);

  void tick;

  return (
    <div>
      <div className="relative mt-2">
        <div className="absolute left-0 top-5 h-1 w-full rounded-full bg-cream/10" />
        <motion.div
          className="absolute left-0 top-5 h-1 rounded-full bg-ember"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="relative flex justify-between">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            const isDone = i < activeIndex || status === "delivered";
            const isActive = i === activeIndex && status !== "delivered";
            return (
              <div key={stage.id} className="flex flex-col items-center gap-2" style={{ width: `${100 / stages.length}%` }}>
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-charcoal transition-colors",
                    isDone || isActive ? "border-ember bg-ember text-cream" : "border-cream/15 text-cream/60"
                  )}
                >
                  {isDone && !isActive ? <Check size={16} /> : <Icon size={16} />}
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] font-display font-bold uppercase tracking-wide",
                    isDone || isActive ? "text-cream" : "text-cream/60"
                  )}
                >
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
