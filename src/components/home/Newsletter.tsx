"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { isValidEmail } from "@/lib/validation";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Client-side only: there's no backend, and the address is never stored or sent.
    if (email.length > 254 || !isValidEmail(email)) {
      setError("That email doesn't look right. Try again?");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  return (
    // Rendered as the footer strip of the app promo card, not as its own section.
    <div className="border-t border-cream/10 bg-charcoal-soft px-8 py-8 sm:px-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h3 className="font-display text-xl font-extrabold tracking-tight text-cream">Not an app person?</h3>
        <p className="mt-1 text-sm text-cream/70">Get new menu drops and the good deals by email, about twice a month.</p>
      </div>
      <div>

      {submitted ? (
        <p role="status" className="font-display text-sm font-bold text-ember-text">
          You&apos;re on the list. (Ember is a demo, so your email wasn&apos;t stored or sent anywhere.)
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "newsletter-email-error" : undefined}
            placeholder="you@email.com"
            className="focus-ring w-full rounded-full border border-cream/15 bg-charcoal-raised px-5 py-3 text-sm text-cream placeholder:text-cream/60 sm:w-72"
          />
          <Button type="submit" variant="primary" size="md">
            Sign Me Up
          </Button>
        </form>
      )}
      {error && (
        <p id="newsletter-email-error" className="mt-2 text-xs font-semibold text-ember-text">
          {error}
        </p>
      )}
      </div>
      </div>
    </div>
  );
}
