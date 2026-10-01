"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as m from "motion/react-m";
import { Search, X, Flame, TrendingUp, Leaf, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { products } from "@/lib/data/products";
import { categories } from "@/lib/data/categories";
import { deals } from "@/lib/data/deals";
import { Allergen, CategoryId, Product } from "@/types";
import { ALLERGENS } from "@/lib/data/allergens";
import { useFlyToCartActions } from "@/context/fly-to-cart-context";
import { ProductGrid } from "@/components/product/ProductGrid";
import { cn, formatPrice } from "@/lib/utils";
import { buildDealCartItem } from "@/lib/cart";
import { useCartActions } from "@/context/cart-context";
import { Button } from "@/components/ui/Button";
import { LayoutMotion } from "@/components/providers/LayoutMotion";

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
  const [excludedAllergens, setExcludedAllergens] = useState<Allergen[]>([]);
  // Phones show one sticky row (category chips + "Filters"); this reveals the rest.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { addItem } = useCartActions();
  const { launch } = useFlyToCartActions();
  const isDeals = category === "deals";

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
      if (excludedAllergens.some((a) => p.allergens.includes(a))) return false;
      return true;
    });
  }, [search, category, priceMax, popularOnly, vegOnly, spicyOnly, excludedAllergens]);

  // Deals have no dietary or allergen data, so only search and price apply to them.
  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (d.price > priceMax) return false;
      if (!q) return true;
      return `${d.name} ${d.description} ${d.includes.join(" ")}`.toLowerCase().includes(q);
    });
  }, [search, priceMax]);

  const activeFilterCount =
    (priceId !== "any" ? 1 : 0) +
    (isDeals ? 0 : (popularOnly ? 1 : 0) + (vegOnly ? 1 : 0) + (spicyOnly ? 1 : 0) + excludedAllergens.length);

  function toggleAllergen(id: Allergen) {
    setExcludedAllergens((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

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

  function addDealToCart(dealId: string, source: HTMLElement | null) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;
    launch(source, deal.image);
    addItem(buildDealCartItem(deal));
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
      <div className="text-center">
        <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ember-text">Order Now</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-cream sm:text-5xl">
          THE MENU
        </h1>
      </div>

      <div className="relative mt-8">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cream/60" />
        <input
          ref={searchInputRef}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isDeals ? "Search deals…" : "Search burgers, pizza, chicken, fries…"}
          className="focus-ring w-full rounded-full border border-cream/15 bg-charcoal-raised py-3.5 pl-11 pr-10 text-sm text-cream placeholder:text-cream/60 [&::-webkit-search-cancel-button]:hidden"
          aria-label={isDeals ? "Search deals" : "Search menu"}
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

      {/* Phones: a single sticky row of chips plus a Filters toggle. sm+: everything inline. */}
      <div className="sticky top-16 z-20 -mx-5 mt-3 bg-charcoal/95 px-5 py-3 backdrop-blur sm:relative sm:top-0 sm:mx-0 sm:mt-4 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto scrollbar-none pb-1">
            <CategoryChip active={category === "all"} onClick={() => setCategory("all")}>
              All
            </CategoryChip>
            {categories.map((cat) => (
              <CategoryChip key={cat.id} active={category === cat.id} onClick={() => setCategory(cat.id)}>
                {cat.name}
              </CategoryChip>
            ))}
            <CategoryChip active={isDeals} onClick={() => setCategory("deals")}>
              <Flame size={12} className="fill-current" />
              Deals
            </CategoryChip>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            aria-controls="menu-filters"
            className={cn(
              "focus-ring mb-1 flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-display font-bold uppercase tracking-wide transition-all active:scale-95 sm:hidden",
              filtersOpen || activeFilterCount > 0
                ? "border-ember bg-ember/10 text-cream"
                : "border-cream/10 bg-charcoal-raised text-cream/70"
            )}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-ember-fill px-1 text-[10px] text-cream">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div
          id="menu-filters"
          className={cn("mt-3 flex-col gap-3 sm:flex", filtersOpen ? "flex" : "hidden")}
        >
          <div className="flex flex-wrap gap-2">
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
            {!isDeals && (
              <>
                <ToggleChip active={popularOnly} onClick={() => setPopularOnly((v) => !v)} icon={<TrendingUp size={12} />}>
                  Popular
                </ToggleChip>
                <ToggleChip active={vegOnly} onClick={() => setVegOnly((v) => !v)} icon={<Leaf size={12} />}>
                  Vegetarian
                </ToggleChip>
                <ToggleChip active={spicyOnly} onClick={() => setSpicyOnly((v) => !v)} icon={<Flame size={12} />}>
                  Spicy
                </ToggleChip>
              </>
            )}
          </div>
          {!isDeals && (
            <div role="group" aria-labelledby="allergen-filter-label" className="flex flex-wrap items-center gap-2">
              <span id="allergen-filter-label" className="text-xs font-semibold text-cream/60">
                Hide items with…
              </span>
              {ALLERGENS.map((a) => (
                <ToggleChip
                  key={a.id}
                  active={excludedAllergens.includes(a.id)}
                  onClick={() => toggleAllergen(a.id)}
                  icon={excludedAllergens.includes(a.id) ? <X size={12} /> : null}
                >
                  {a.label}
                </ToggleChip>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-10">
        {isDeals && filteredDeals.length === 0 ? (
          <ProductGrid products={[]} emptyMessage="No deals match your search." />
        ) : isDeals ? (
          <LayoutMotion>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredDeals.map((deal, i) => {
                const savings = Math.round((deal.originalPrice - deal.price) * 100) / 100;
                return (
                  <m.div
                    key={deal.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: (i % 3) * 0.06,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    data-deal-card
                    className="flex flex-col overflow-hidden rounded-3xl border border-cream/10 bg-charcoal-raised"
                  >
                    <div className="relative aspect-[16/10]" data-fly-source>
                      <Image src={deal.image} alt={deal.name} fill sizes="(min-width: 1280px) 392px, (min-width: 1024px) calc((100vw - 104px) / 3), (min-width: 640px) calc((100vw - 84px) / 2), calc(100vw - 40px)" className="object-cover" />
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
                      <Button variant="primary" className="mt-4 w-full" onClick={(e) =>
                          addDealToCart(
                            deal.id,
                            e.currentTarget.closest("[data-deal-card]")?.querySelector<HTMLElement>("[data-fly-source]") ?? null
                          )
                        }>
                        {deal.ctaLabel}
                      </Button>
                    </div>
                  </m.div>
                );
              })}
            </div>
          </LayoutMotion>
        ) : sections.length === 0 ? (
          <ProductGrid products={[]} emptyMessage="Try a different search or clear your filters." />
        ) : (
          <div className="flex flex-col gap-14">
            {sections.map(({ cat, items }, sectionIndex) => (
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
                {/* Only the first section is above the fold on load. */}
                <ProductGrid products={items} preloadCount={sectionIndex === 0 ? 4 : 0} />
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
        active ? "bg-ember-fill text-cream" : "border border-cream/10 bg-charcoal-raised text-cream/60 hover:text-cream"
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
        active ? "bg-ember-fill text-cream" : "border border-cream/10 bg-charcoal-raised text-cream/60 hover:text-cream"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
