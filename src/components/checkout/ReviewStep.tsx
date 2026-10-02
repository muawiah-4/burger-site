"use client";

import { useId, useState } from "react";
import { CreditCard, Banknote, Wallet, Pencil } from "lucide-react";
import { CartItem, CustomerInfo, DeliveryAddress, FulfillmentMethod, PaymentMethod } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import { computeTip, parseTipDollars, TIP_PERCENTS, TipChoice } from "@/lib/tip";
import { formatSlot } from "@/lib/schedule";
import { paymentLabel } from "@/lib/payment";
import { locations } from "@/lib/data/locations";

const PAYMENT_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  wallet: Wallet,
};

export function ReviewStep({
  fulfillment,
  customer,
  address,
  pickupLocationId,
  payment,
  items,
  onEditStep,
  onEditItems,
  scheduledFor,
  tip,
  onTipChange,
  subtotalCents,
}: {
  fulfillment: FulfillmentMethod;
  customer: CustomerInfo;
  address: DeliveryAddress;
  pickupLocationId: string | null;
  payment: PaymentMethod;
  items: CartItem[];
  onEditStep: (step: number) => void;
  onEditItems: () => void;
  scheduledFor: string | null;
  tip: TipChoice;
  onTipChange: (tip: TipChoice) => void;
  subtotalCents: number;
}) {
  const PaymentIcon = PAYMENT_ICON[payment];
  const pickupLocation = locations.find((l) => l.id === pickupLocationId);

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Review your order</h2>
      <p className="mt-1 text-sm text-cream/60">Double-check everything before you place it.</p>

      <div className="mt-6 flex flex-col gap-3">
        <ReviewRow title="Items" editLabel="Edit items in cart" onEdit={onEditItems}>
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.cartItemId} className="text-sm">
                <div className="flex justify-between gap-3 text-cream/70">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-cream">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-cream/60">
                    {item.selectedOptions.map((o) => o.choiceLabels.join(", ")).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </ReviewRow>

        <ReviewRow title="Fulfillment" onEdit={() => onEditStep(1)}>
          <p className="text-sm capitalize text-cream/70">{fulfillment}</p>
          <p className="text-sm text-cream/60" data-testid="review-when">
            {scheduledFor ? `Scheduled for ${formatSlot(new Date(scheduledFor))} today` : "ASAP"}
          </p>
        </ReviewRow>

        <ReviewRow title="Contact" onEdit={() => onEditStep(2)}>
          <p className="text-sm text-cream/70">{customer.name}</p>
          <p className="text-sm text-cream/60">
            {customer.phone} · {customer.email}
          </p>
        </ReviewRow>

        <ReviewRow title={fulfillment === "delivery" ? "Delivery Address" : "Pickup Location"} onEdit={() => onEditStep(3)}>
          {fulfillment === "delivery" ? (
            <>
              <p className="text-sm text-cream/70">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
              </p>
              <p className="text-sm text-cream/60">
                {address.city}, {address.zip}
              </p>
              {address.instructions && <p className="text-xs text-cream/60">{address.instructions}</p>}
            </>
          ) : (
            <>
              <p className="text-sm text-cream/70">{pickupLocation?.name}</p>
              <p className="text-sm text-cream/60">{pickupLocation?.address}</p>
            </>
          )}
        </ReviewRow>

        <ReviewRow title="Payment" onEdit={() => onEditStep(4)}>
          <p className="flex items-center gap-2 text-sm text-cream/70">
            <PaymentIcon size={15} /> {paymentLabel(payment, fulfillment)}
          </p>
        </ReviewRow>

        {fulfillment === "delivery" && (
          <TipSelector value={tip} onChange={onTipChange} subtotalCents={subtotalCents} />
        )}
      </div>
    </div>
  );
}

function ReviewRow({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-cream/10 bg-charcoal-raised p-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">{title}</h3>
        <div className="mt-1">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel ?? `Edit ${title}`}
        className="focus-ring flex shrink-0 items-center gap-1 text-xs font-semibold text-ember-text hover:underline"
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}

function TipSelector({
  value,
  onChange,
  subtotalCents,
}: {
  value: TipChoice;
  onChange: (tip: TipChoice) => void;
  subtotalCents: number;
}) {
  const inputId = useId();
  const [customText, setCustomText] = useState(
    value.kind === "custom" ? (value.cents / 100).toFixed(2) : ""
  );
  const [customInvalid, setCustomInvalid] = useState(false);
  const options: { key: string; label: string; sub?: string; choice: TipChoice }[] = [
    { key: "none", label: "None", choice: { kind: "none" } },
    ...TIP_PERCENTS.map((percent) => ({
      key: `p${percent}`,
      label: `${percent}%`,
      sub: formatPrice(computeTip(subtotalCents, { kind: "percent", percent }) / 100),
      choice: { kind: "percent", percent } as TipChoice,
    })),
  ];
  const activeKey = value.kind === "percent" ? `p${value.percent}` : value.kind;

  return (
    <div className="rounded-2xl border border-cream/10 bg-charcoal-raised p-4">
      <h3 id={`${inputId}-label`} className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">
        Driver tip
      </h3>
      <p className="mt-0.5 text-xs text-cream/60">100% goes to your driver.</p>
      <div role="radiogroup" aria-labelledby={`${inputId}-label`} className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <TipButton key={o.key} active={activeKey === o.key} onClick={() => onChange(o.choice)}>
            {o.label}
            {o.sub && <span className="text-[10px] font-normal opacity-80">{o.sub}</span>}
          </TipButton>
        ))}
        <TipButton
          active={activeKey === "custom"}
          onClick={() => {
            const cents = parseTipDollars(customText);
            onChange({ kind: "custom", cents: cents ?? 0 });
            requestAnimationFrame(() => document.getElementById(inputId)?.focus());
          }}
        >
          Custom
        </TipButton>
      </div>
      {activeKey === "custom" && (
        <div className="mt-3">
          <label htmlFor={inputId} className="text-xs font-semibold text-cream/70">
            Custom tip ($)
          </label>
          <input
            id={inputId}
            inputMode="decimal"
            autoComplete="off"
            value={customText}
            placeholder="0.00"
            aria-invalid={customInvalid || undefined}
            onChange={(e) => {
              setCustomText(e.target.value);
              const cents = parseTipDollars(e.target.value);
              setCustomInvalid(e.target.value.trim() !== "" && cents === null);
              onChange({ kind: "custom", cents: cents ?? 0 });
            }}
            className="focus-ring mt-1.5 block w-36 rounded-xl border border-cream/15 bg-charcoal px-3 py-2 text-sm text-cream"
          />
          {customInvalid && (
            <p role="alert" className="mt-1 text-xs font-semibold text-ember-text">
              Enter an amount like 4.50 (up to $100).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TipButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "focus-ring flex min-w-16 flex-col items-center rounded-2xl border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95",
        active ? "border-ember bg-ember-fill text-cream" : "border-cream/15 bg-charcoal text-cream hover:border-cream/30"
      )}
    >
      {children}
    </button>
  );
}
