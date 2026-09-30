"use client";

import { useEffect } from "react";

// Shared across every overlay so that closing one (e.g. the product modal opened
// from the mobile menu) doesn't unlock scrolling while another is still open.
let lockCount = 0;
let previousOverflow = "";

/** Locks body scrolling while `locked` is true. Safe to use from several overlays at once. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    if (lockCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [locked]);
}
