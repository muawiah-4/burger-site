import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { categories } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

// Server Component: the item counts are computed here, so the product catalogue
// never reaches the client for this section.
export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28" id="categories">
      <SectionHeading label="Browse" title="Popular Categories" />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {categories.map((cat, i) => {
          const count = getProductsByCategory(cat.id).length;
          return (
            <Reveal
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.4,
                delay: (i % 4) * 0.06,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Link
                href={`/menu?category=${cat.id}`}
                className="focus-ring group relative flex aspect-square flex-col justify-end overflow-hidden rounded-3xl border border-cream/10 bg-charcoal p-5"
              >
                <Image
                  src={cat.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover opacity-70 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/20 to-transparent" />
                <div className="relative flex items-end justify-between">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-cream sm:text-lg">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-cream/60">{count} items</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/15 text-cream transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:bg-ember">
                    <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
