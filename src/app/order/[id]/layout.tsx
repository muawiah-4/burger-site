import type { Metadata } from "next";

// Order pages are per-device and client-rendered; keep them out of search indexes.
export const metadata: Metadata = {
  title: "Your Order — Ember",
  robots: { index: false, follow: false },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
