"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Search, X, Flame, TrendingUp, Leaf } from "lucide-react";
import Image from "next/image";
import { products } from "@/lib/data/products";
import { categories } from "@/lib/data/categories";
import { deals } from "@/lib/data/deals";
import { CategoryId, Product } from "@/types";
import { ProductGrid } from "@/components/product/ProductGrid";
import { cn, formatPrice } from "@/lib/utils";
import { buildDealCartItem } from "@/lib/cart";
import { useCart } from "@/context/cart-context";
import { Button } from "@/components/ui/Button";

type CategoryFilter = "all" | CategoryId | "deals";

const PRICE_OPTIONS = [
  { id: "any", label: "Any price", max: Infinity },
  { id: "under5", label: "Under $5", max: 5 },
  { id: "under10", label: "Under $10", max: 10 },
  { id: "under15", label: "Under $15", max: 15 },
];

const CATEGORY_FILTERS = new Set<string>(["all", "deals", ...categories.map((c) => c.id)]);

function parseCategory(value: string | null): CategoryFilter {
  return value && CATEGORY_FILTERS.has(value) ? (value as CategoryFilter) : "all";
}

export function MenuView() {
  const searchParams = useSearchParams();
  // The URL is the source of truth, so back/forward and in-app links to
  // /menu?category=… always match the selected chip. Unknown values fall back to "all".
  const category = parseCategory(searchParams.get("category"));

  function setCategory(next: CategoryFilter) {
    if (next === category) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("category");
    else params.set("category", next);
    params.delete("focus");
    const query = params.toString();
    // Native pushState integrates with the Next.js router and useSearchParams.
    window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
  }

  const [search, setSearch] = useState("");
  const [priceId, setPriceId] = useState("any");
  const [popularOnly, setPopularOnly] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [spicyOnly, setSpicyOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { addItem, openCart } = useCart();

  useEffect(() => {
    if (searchParams.get("focus") === "search") {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  const priceMax = PRICE_OPTIONS.find((p) => p.id === priceId)?.max ?? Infinity;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && category !== "deals" && p.category !== category) return false;
      if (q) {
        const haystack = `${p.name} ${p.description} ${p.ingredients.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (p.price > priceMax) return false;
      if (popularOnly && !p.isPopular) return false;
      if (vegOnly && !p.isVegetarian) return false;
      if (spicyOnly && !p.isSpicy) return false;
      return true;
    });
  }, [search, category, priceMax, popularOnly, vegOnly, spicyOnly]);

  const sections = useMemo(() => {
    const byCategory = new Map<CategoryId, Product[]>();
    for (const p of filtered) {
      const list = byCategory.get(p.category) ?? [];
      list.push(p);
      byCategory.set(p.category, list);
    }
    return categories
      .map((cat) => ({ cat, items: byCategory.get(cat.id) ?? [] }))
      .filter((s) => s.items.length > 0);
  }, [filtered]);

  function addDealToCart(dealId: string) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    addItem(buildDealCartItem(deal));
    openCart();
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
      <div className="text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ember">Order Now</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-cream sm:text-5xl">
          THE MENU
        </h1>
      </div>

      <div className="sticky top-16 z-20 mt-8 -mx-5 bg-charcoal/95 px-5 py-4 backdrop-blur sm:relative sm:top-0 sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/60" />
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search burgers, pizza, chicken, fries…"
            className="focus-ring w-full rounded-full border border-cream/15 bg-charcoal-raised py-3.5 pl-11 pr-10 text-sm text-cream placeholder:text-cream/60"
            aria-label="Search menu"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="focus-ring absolute right-4 top-1/2 -translate-y-1/2 text-cream/60 transition-transform active:scale-90 hover:text-cream"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
            All
          </CategoryChip>
          {categories.map((cat) => (
            <CategoryChip key={cat.id} active={category === cat.id} onClick={() => setCategory(cat.id)}>
              {cat.name}
            </CategoryChip>
          ))}
          <CategoryChip active={category === "deals"} onClick={() => setCategory("deals")}>
            <Flame size={12} className="fill-current" />
            Deals
          </CategoryChip>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={priceId}
            onChange={(e) => setPriceId(e.target.value)}
            className="focus-ring rounded-full border border-cream/15 bg-charcoal-raised px-3.5 py-1.5 text-xs font-semibold text-cream"
            aria-label="Filter by price"
          >
            {PRICE_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <ToggleChip active={popularOnly} onClick={() => setPopularOnly((v) => !v)} icon={<TrendingUp size={12} />}>
            Popular
          </ToggleChip>
          <ToggleChip active={vegOnly} onClick={() => setVegOnly((v) => !v)} icon={<Leaf size={12} />}>
            Vegetarian
          </ToggleChip>
          <ToggleChip active={spicyOnly} onClick={() => setSpicyOnly((v) => !v)} icon={<Flame size={12} />}>
            Spicy
          </ToggleChip>
        </div>
      </div>

      <div className="mt-10">
        {category === "deals" ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {deals.map((deal, i) => {
              const savings = Math.round((deal.originalPrice - deal.price) * 100) / 100;
              return (
                <motion.div
                  key={deal.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: (i % 3) * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex flex-col overflow-hidden rounded-3xl border border-cream/10 bg-charcoal-raised"
                >
                  <div className="relative aspect-[16/10]">
                    <Image src={deal.image} alt={deal.name} fill sizes="33vw" className="object-cover" />
                    <div className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[11px] font-display font-bold uppercase text-charcoal">
                      Save {formatPrice(savings)}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-lg font-extrabold text-cream">{deal.name}</h3>
                    <p className="mt-1 text-sm text-cream/60">{deal.description}</p>
                    <div className="mt-4 flex items-end gap-2">
                      <span className="font-display text-2xl font-extrabold text-cream">{formatPrice(deal.price)}</span>
                      <span className="pb-0.5 text-sm text-cream/60 line-through">{formatPrice(deal.originalPrice)}</span>
                    </div>
                    <Button variant="primary" className="mt-4 w-full" onClick={() => addDealToCart(deal.id)}>
                      {deal.ctaLabel}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : sections.length === 0 ? (
          <ProductGrid products={[]} emptyMessage="Try a different search or clear your filters." />
        ) : (
          <div className="flex flex-col gap-14">
            {sections.map(({ cat, items }) => (
              <section key={cat.id} aria-labelledby={`menu-heading-${cat.id}`}>
                <div className="mb-5 flex items-baseline justify-between border-b border-cream/10 pb-3">
                  <h2
                    id={`menu-heading-${cat.id}`}
                    className="font-display text-2xl font-extrabold tracking-tight text-cream sm:text-3xl"
                  >
                    {cat.name}
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-cream/60">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>
                <ProductGrid products={items} />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-display font-bold uppercase tracking-wide transition-all active:scale-95",
        active ? "bg-ember text-cream" : "border border-cream/10 bg-charcoal-raised text-cream/60 hover:text-cream"
      )}
    >
      {children}
    </button>
  );
}

function ToggleChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-ring flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95",
        active ? "bg-ember text-cream" : "border border-cream/10 bg-charcoal-raised text-cream/60 hover:text-cream"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
