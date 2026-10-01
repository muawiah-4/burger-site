import { Star } from "lucide-react";
import { reviews } from "@/lib/data/reviews";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function Reviews() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-24">
      <SectionHeading label="Reviews" title="What Regulars Say" align="center" />
      <div className="mt-10 flex gap-4 overflow-x-auto scrollbar-none pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="flex w-[80vw] shrink-0 snap-start flex-col gap-3 rounded-3xl border border-cream/10 bg-charcoal-raised p-5 sm:w-auto"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ember/10 font-display text-xs font-bold text-ember-text">
                {review.initials}
              </div>
              <div>
                <p className="font-display text-sm font-bold text-cream">{review.name}</p>
                <div className="flex items-center gap-0.5" role="img" aria-label={`Rated ${review.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      aria-hidden="true"
                      className={i < review.rating ? "fill-gold text-gold" : "fill-cream/10 text-cream/10"}
                    />
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-cream/70">&ldquo;{review.text}&rdquo;</p>
            {review.item && <p className="text-xs font-semibold text-cream/60">Ordered: {review.item}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
