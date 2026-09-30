"use client";

import { CustomerInfo } from "@/types";
import { Field } from "./Field";

export function CustomerStep({
  value,
  errors,
  onChange,
}: {
  value: CustomerInfo;
  errors: Partial<Record<keyof CustomerInfo, string>>;
  onChange: (next: CustomerInfo) => void;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Your information</h2>
      <p className="mt-1 text-sm text-cream/60">We&apos;ll use this to keep you posted on your order.</p>
      <div className="mt-6 flex flex-col gap-4">
        <Field
          id="checkout-name"
          label="Full Name"
          placeholder="Jordan Rivera"
          autoComplete="name"
          value={value.name}
          error={errors.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
        <Field
          id="checkout-phone"
          label="Phone Number"
          placeholder="(555) 123-4567"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value.phone}
          error={errors.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
        <Field
          id="checkout-email"
          label="Email"
          placeholder="you@email.com"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={value.email}
          error={errors.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
    </div>
  );
}
