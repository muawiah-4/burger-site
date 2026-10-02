import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuView } from "./MenuView";

export const metadata: Metadata = {
  title: "The Ember Menu",
  description: "Smash burgers, stone-baked pizza, fried chicken, wraps, sides, desserts and shakes from Ember in San Francisco. Order for delivery or pickup.",
};

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MenuView />
    </Suspense>
  );
}
