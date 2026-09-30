"use client";

import { LazyMotion } from "motion/react";

type FeatureBundle = typeof import("@/lib/motion/dom-max").default;

let domMax: Promise<FeatureBundle> | undefined;
function loadDomMax() {
  return (domMax ??= import("@/lib/motion/dom-max").then((mod) => mod.default));
}
// Only modules that render layout animations import this file, so the bigger
// bundle is fetched (in parallel with hydration) on those routes only.
if (typeof window !== "undefined") void loadDomMax();

/** Adds layout-animation support (domMax) for `m` elements that use `layout`. */
export function LayoutMotion({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadDomMax} strict>
      {children}
    </LazyMotion>
  );
}
