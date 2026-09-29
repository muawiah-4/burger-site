"use client";

import { MotionConfig } from "motion/react";

/**
 * Honours prefers-reduced-motion app-wide: Motion skips transform/layout
 * animations for users who opt out. Components must not branch their rendered
 * props on useReducedMotion() — it is null on the server and real on the
 * client, which causes hydration mismatches.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
