"use client";

import { CreditCard, Banknote, Wallet, Check } from "lucide-react";
import { PaymentMethod } from "@/types";
import { cn } from "@/lib/utils";
import { Field } from "./Field";

export interface CardDetails {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
}

const METHODS: { id: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "cash", label: "Cash on Delivery", icon: Banknote },
  { id: "wallet", label: "Digital Wallet", icon: Wallet },
];

export function PaymentStep({
  method,
  onMethodChange,
  card,
  onCardChange,
  errors,
}: {
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  card: CardDetails;
  onCardChange: (next: CardDetails) => void;
  errors: Partial<Record<keyof CardDetails, string>>;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Payment</h2>
      <p className="mt-1 text-sm text-cream/60">Choose how you&apos;d like to pay.</p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {METHODS.map((m) => {
          const Icon = m.icon;
          const active = method === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onMethodChange(m.id)}
              aria-pressed={active}
              className={cn(
                "focus-ring relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all active:scale-[0.98]",
                active ? "border-ember bg-ember/5" : "border-cream/10 bg-charcoal-raised hover:border-cream/25"
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-cream">
                  <Check size={11} />
                </span>
              )}
              <Icon size={22} className={active ? "text-ember" : "text-cream/60"} />
              <span className="font-display text-xs font-bold text-cream">{m.label}</span>
            </button>
          );
        })}
      </div>

      {method === "card" && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="checkout-cc-name"
            label="Name on Card"
            placeholder="Jordan Rivera"
            autoComplete="cc-name"
            value={card.name}
            error={errors.name}
            wrapperClassName="sm:col-span-2"
            onChange={(e) => onCardChange({ ...card, name: e.target.value })}
          />
          <Field
            id="checkout-cc-number"
            label="Card Number"
            placeholder="4242 4242 4242 4242"
            inputMode="numeric"
            autoComplete="cc-number"
            value={card.number}
            error={errors.number}
            wrapperClassName="sm:col-span-2"
            onChange={(e) => onCardChange({ ...card, number: e.target.value })}
          />
          <Field
            id="checkout-cc-exp"
            label="Expiry (MM/YY)"
            placeholder="08/28"
            autoComplete="cc-exp"
            value={card.expiry}
            error={errors.expiry}
            onChange={(e) => onCardChange({ ...card, expiry: e.target.value })}
          />
          <Field
            id="checkout-cc-csc"
            label="CVC"
            placeholder="123"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={card.cvc}
            error={errors.cvc}
            onChange={(e) => onCardChange({ ...card, cvc: e.target.value })}
          />
        </div>
      )}

      {method === "cash" && (
        <p className="mt-6 rounded-2xl bg-cream/5 p-4 text-sm text-cream/60">
          Pay with cash when your order arrives. Please have exact change ready if possible.
        </p>
      )}

      {method === "wallet" && (
        <p className="mt-6 rounded-2xl bg-cream/5 p-4 text-sm text-cream/60">
          Digital wallet checkout (Apple Pay / Google Pay) will be available at pickup or delivery.
        </p>
      )}
    </div>
  );
}
