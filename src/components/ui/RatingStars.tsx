import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  size = 14,
  showValue = true,
  reviewCount,
  className,
}: {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)} aria-label={`Rated ${rating} out of 5`}>
      <Star size={size} className="fill-gold text-gold" aria-hidden="true" />
      {showValue && <span className="text-xs font-semibold text-cream/80">{rating.toFixed(1)}</span>}
      {reviewCount !== undefined && (
        <span className="text-xs text-cream/60">({reviewCount})</span>
      )}
    </div>
  );
}
