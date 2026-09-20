import { cn } from "@/lib/utils";
import { Flame } from "lucide-react";
import { Badge as BadgeType } from "@/types";

const styles: Record<BadgeType, string> = {
  "best-seller": "bg-gold text-charcoal",
  new: "bg-charcoal text-cream",
  spicy: "bg-ember text-cream",
  veggie: "bg-basil text-cream",
};

const labels: Record<BadgeType, string> = {
  "best-seller": "Best Seller",
  new: "New",
  spicy: "Spicy",
  veggie: "Veggie",
};

export function Badge({ type, className }: { type: BadgeType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wider shadow-sm",
        styles[type],
        className
      )}
    >
      {type === "spicy" && <Flame size={11} className="fill-current" aria-hidden="true" />}
      {labels[type]}
    </span>
  );
}
