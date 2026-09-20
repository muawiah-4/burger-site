import { Suspense } from "react";
import type { Metadata } from "next";
import { MenuView } from "./MenuView";

export const metadata: Metadata = {
  title: "The Menu — Ember",
  description: "Browse burgers, pizza, chicken, wraps, sides, desserts and drinks.",
};

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <MenuView />
    </Suspense>
  );
}
