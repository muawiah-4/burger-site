"use client";

import { Check, MapPin, Clock } from "lucide-react";
import { DeliveryAddress } from "@/types";
import { locations } from "@/lib/data/locations";
import { cn } from "@/lib/utils";
import { Field } from "./Field";

export function AddressStep({
  fulfillment,
  address,
  errors,
  onAddressChange,
  pickupLocationId,
  onPickupLocationChange,
}: {
  fulfillment: "delivery" | "pickup";
  address: DeliveryAddress;
  errors: Partial<Record<keyof DeliveryAddress, string>>;
  onAddressChange: (next: DeliveryAddress) => void;
  pickupLocationId: string | null;
  onPickupLocationChange: (id: string) => void;
}) {
  if (fulfillment === "pickup") {
    return (
      <div>
        <h2 id="pickup-heading" className="font-display text-xl font-extrabold text-cream">
          Choose a pickup location
        </h2>
        <p className="mt-1 text-sm text-cream/60">Pick the Ember closest to you.</p>
        <div
          role="group"
          aria-labelledby="pickup-heading"
          aria-describedby={errors.line1 ? "pickup-error" : undefined}
          className="mt-6 flex flex-col gap-3"
        >
          {locations.map((loc, index) => {
            const active = pickupLocationId === loc.id;
            return (
              <button
                key={loc.id}
                id={index === 0 ? "checkout-pickup-first" : undefined}
                type="button"
                onClick={() => onPickupLocationChange(loc.id)}
                aria-pressed={active}
                className={cn(
                  "focus-ring flex items-center justify-between gap-4 rounded-3xl border-2 p-4 text-left transition-all active:scale-[0.98]",
                  active ? "border-ember bg-ember/5" : "border-cream/10 bg-charcoal-raised hover:border-cream/25"
                )}
              >
                <div>
                  <p className="font-display text-sm font-extrabold text-cream">{loc.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream/60">
                    <MapPin size={12} /> {loc.address}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cream/60">
                    <Clock size={12} /> Ready in {loc.pickupEta}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    active ? "bg-ember text-cream" : "bg-cream/5 text-transparent"
                  )}
                >
                  <Check size={13} />
                </span>
              </button>
            );
          })}
        </div>
        {errors.line1 && (
          <p id="pickup-error" role="alert" className="mt-2 text-xs font-semibold text-ember-text">
            {errors.line1}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Delivery address</h2>
      <p className="mt-1 text-sm text-cream/60">Where should we bring your order?</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="checkout-line1"
          label="Street Address"
          placeholder="123 Main Street"
          autoComplete="address-line1"
          value={address.line1}
          error={errors.line1}
          wrapperClassName="sm:col-span-2"
          onChange={(e) => onAddressChange({ ...address, line1: e.target.value })}
        />
        <Field
          id="checkout-line2"
          label="Apartment / Floor"
          placeholder="Apt 4B (optional)"
          autoComplete="address-line2"
          value={address.line2}
          onChange={(e) => onAddressChange({ ...address, line2: e.target.value })}
        />
        <Field
          id="checkout-city"
          label="City"
          placeholder="Springfield"
          autoComplete="address-level2"
          value={address.city}
          error={errors.city}
          onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
        />
        <Field
          id="checkout-zip"
          label="ZIP Code"
          placeholder="94105"
          autoComplete="postal-code"
          inputMode="numeric"
          value={address.zip}
          error={errors.zip}
          onChange={(e) => onAddressChange({ ...address, zip: e.target.value })}
        />
        <Field
          id="checkout-instructions"
          label="Delivery Instructions"
          placeholder="Leave at door (optional)"
          autoComplete="off"
          value={address.instructions}
          wrapperClassName="sm:col-span-2"
          onChange={(e) => onAddressChange({ ...address, instructions: e.target.value })}
        />
      </div>
    </div>
  );
}
