"use client";

import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { ComboCard } from "./ComboCard";

type ComboConfig = { key: string; tabLabel: string; card: Omit<ComponentProps<typeof ComboCard>, "switcher"> };

/** One "Make it a combo" block: a burger/pizza toggle in front of a single ComboCard. */
export function ComboBuilder({ combos }: { combos: ComboConfig[] }) {
  const [active, setActive] = useState(combos[0].key);
  const current = combos.find((c) => c.key === active) ?? combos[0];

  const switcher = (
    <div className="flex">
    <div role="group" aria-label="Combo type" className="inline-flex gap-1 rounded-full bg-charcoal p-1">
      {combos.map((c) => {
        const selected = c.key === active;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={selected}
            onClick={() => setActive(c.key)}
            className={cn(
              "focus-ring rounded-full px-4 py-2 font-display text-xs font-bold uppercase tracking-wider transition-colors",
              selected ? "bg-ember-fill text-cream" : "text-cream/70 hover:text-cream"
            )}
          >
            {c.tabLabel}
          </button>
        );
      })}
    </div>
    </div>
  );

  // Keyed so the card's own item/drink selection resets when the combo type changes.
  return <ComboCard key={current.key} {...current.card} switcher={switcher} />;
}
