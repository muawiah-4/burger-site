import type { Metadata } from "next";

// The checkout page is a client component, so its metadata lives in this server layout.
export const metadata: Metadata = {
  title: "Checkout — Ember",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
