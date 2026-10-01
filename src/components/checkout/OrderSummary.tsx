import Image from "next/image";
import { CartItem } from "@/types";
import { Totals } from "@/lib/cart";
import { formatPrice } from "@/lib/utils";

export function OrderSummary({
  items,
  totals,
  showItems = true,
  tip = 0,
}: {
  items: CartItem[];
  totals: Totals;
  /** Hide the line items when they're already listed nearby (the Review step). */
  showItems?: boolean;
  /** Driver tip in dollars, shown as its own line and added to the displayed total. */
  tip?: number;
}) {
  return (
    <div className="rounded-3xl border border-cream/10 bg-charcoal-raised p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wide text-cream/60">
        Order Summary
      </h2>
      {showItems && (
      <ul className="mt-4 flex max-h-64 flex-col gap-3 overflow-y-auto">
        {items.map((item) => (
          <li key={item.cartItemId} className="flex gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-charcoal-soft">
              <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-xs font-bold text-cream">
                  {item.quantity}× {item.name}
                </p>
                <span className="shrink-0 font-display text-xs font-bold text-cream">
                  {formatPrice(item.unitPrice * item.quantity)}
                </span>
              </div>
              {item.selectedOptions.length > 0 && (
                <p className="text-[11px] text-cream/60">
                  {item.selectedOptions.map((o) => o.choiceLabels.join(", ")).join(" · ")}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      )}
      <div
        className={
          showItems ? "mt-4 flex flex-col gap-1.5 border-t border-cream/10 pt-4 text-sm" : "mt-4 flex flex-col gap-1.5 text-sm"
        }
      >
        <Row label="Subtotal" value={formatPrice(totals.subtotal)} />
        <Row label="Delivery fee" value={totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)} />
        {totals.discount > 0 && <Row label="Discount" value={`-${formatPrice(totals.discount)}`} accent />}
        <Row label="Tax" value={formatPrice(totals.tax)} />
        {tip > 0 && <Row label="Driver tip" value={formatPrice(tip)} />}
        <div className="mt-1 flex items-center justify-between border-t border-cream/10 pt-2 font-display text-base font-extrabold text-cream">
          <span>Total</span>
          <span>{formatPrice(totals.total + tip)}</span>
        </div>
        {tip > 0 && <p className="text-right text-[11px] text-cream/60">Tip added to total</p>}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-cream/60">
      <span>{label}</span>
      <span className={accent ? "font-semibold text-ember-text" : "text-cream"}>{value}</span>
    </div>
  );
}
