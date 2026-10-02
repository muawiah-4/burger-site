"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Route-segment error boundary. Renders inside the root layout (Navbar/Footer
 * still show), replacing only the page content that threw.
 *
 * Next.js 16.3+ passes `retry`, not the older `reset` — see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[Ember] Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ember-text">
        Something went wrong
      </p>
      <h1 className="max-w-md font-display text-3xl font-extrabold text-cream sm:text-4xl">
        That one didn&apos;t fire right.
      </h1>
      <p className="max-w-sm text-sm text-cream/70">
        Give it another try, or head back to the menu — nothing was charged and your cart is safe.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="focus-ring inline-flex items-center justify-center rounded-full bg-ember-fill px-6 py-3 font-display text-sm font-bold uppercase tracking-wide text-cream transition-colors hover:bg-ember-dark"
        >
          Try again
        </button>
        <ButtonLink href="/menu" variant="secondary">
          Back to the menu
        </ButtonLink>
      </div>
    </div>
  );
}
