"use client";

import { LazyMotion, MotionConfig } from "motion/react";

type FeatureBundle = typeof import("@/lib/motion/dom-animation").default;

let domAnimation: Promise<FeatureBundle> | undefined;
function loadDomAnimation() {
  return (domAnimation ??= import("@/lib/motion/dom-animation").then((mod) => mod.default));
}
// Start fetching as soon as this module runs, in parallel with hydration, rather
// than waiting for LazyMotion's effect.
if (typeof window !== "undefined") void loadDomAnimation();

/**
 * App-wide Motion setup. Components render the lightweight `m` elements; the
 * animation features arrive in a separate chunk (strict mode throws if a full
 * `motion.*` component slips back in). Subtrees with layout animations add
 * <LayoutMotion> for domMax.
 *
 * Import elements with `import * as m from "motion/react-m"`, not `{ m }` from
 * "motion/react": that entry reaches `m` through `import * as fm from
 * "framer-motion"`, which keeps all of framer-motion (full `motion`, domMax) in
 * the client bundle.
 *
 * Also honours prefers-reduced-motion app-wide: Motion skips transform/layout
 * animations for users who opt out. Components must not branch their rendered
 * props on useReducedMotion() — it is null on the server and real on the
 * client, which causes hydration mismatches.
 */
export function MotionProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  // The nonce lets Motion's injected <style> (AnimatePresence popLayout) pass the CSP.
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <MotionConfig reducedMotion="user" nonce={nonce}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
