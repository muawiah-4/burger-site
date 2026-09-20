import { getBestSellers } from "@/lib/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ButtonLink } from "@/components/ui/Button";

export function BestSellers() {
  const products = getBestSellers().slice(0, 8);

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading label="Fan Favorites" title="The Crowd Favorites" />
        <ButtonLink href="/menu" variant="outline" size="sm">
          View Full Menu
        </ButtonLink>
      </div>
      <div className="mt-10">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
