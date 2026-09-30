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
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-28">
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
        GET THE GOOD STUFF.
      </h2>
      <p className="mt-3 text-sm text-cream/60">New drops. Better deals. Zero spam.</p>

      {submitted ? (
        <p role="status" className="mt-6 font-display text-sm font-bold text-ember-text">
          Thanks! Ember is a demo, so your email wasn&apos;t stored or sent anywhere.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
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
    </section>
  );
}
