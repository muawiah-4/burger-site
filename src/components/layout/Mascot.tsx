"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";

const LINES = [
  "Craving something bold?",
  "Try the Spicy Fire Burger.",
  "Fresh dough, fired daily.",
  "Build a combo below.",
  "Zero frozen shortcuts, promise.",
  "Hungry? I won't tell.",
];

export function Mascot() {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const lineIndex = useRef(0);
  const timeouts = useRef<Set<number>>(new Set());
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [reacting, setReacting] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nearFooter, setNearFooter] = useState(false);

  function trackedTimeout(fn: () => void, ms: number) {
    // Forget each id once it fires so the set only holds pending timeouts.
    const id = window.setTimeout(() => {
      timeouts.current.delete(id);
      fn();
    }, ms);
    timeouts.current.add(id);
    return id;
  }

  useEffect(() => {
    const pending = timeouts;
    return () => {
      pending.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setNearFooter(entry.isIntersecting), {
      rootMargin: "0px 0px -10% 0px",
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) return;
    let rafId = 0;
    function onMove(e: MouseEvent) {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const el = rootRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(2.4, dist / 60);
        setPupil({ x: (dx / dist) * reach, y: (dy / dist) * reach });
      });
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const interval = window.setInterval(
      () => {
        setBlinking(true);
        trackedTimeout(() => setBlinking(false), 140);
      },
      3200 + Math.random() * 2200
    );
    return () => window.clearInterval(interval);
  }, [shouldReduceMotion]);

  function handleClick() {
    setReacting(true);
    trackedTimeout(() => setReacting(false), 450);

    const line = LINES[lineIndex.current % LINES.length];
    lineIndex.current += 1;
    setMessage(line);
    trackedTimeout(() => setMessage(null), 2600);
  }

  // It floats over content: keep it off checkout (covers the step buttons and
  // Place Order) and off the menu on phones (covers prices and "+" buttons).
  if (pathname.startsWith("/checkout")) return null;
  const hideOnMobile = pathname.startsWith("/menu");

  return (
    <div
      ref={rootRef}
      className={cn(
        "fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-3 z-30 flex-col items-end gap-2 transition-opacity duration-300 sm:bottom-7 sm:right-7",
        hideOnMobile ? "hidden sm:flex" : "flex"
      )}
      style={nearFooter ? { opacity: 0, pointerEvents: "none" } : undefined}
      // Faded out over the footer: also take it out of the tab order and AT tree.
      inert={nearFooter}
    >
      {/* The tip is visual; announce it through an always-mounted live region too. */}
      <p role="status" className="sr-only">
        {message}
      </p>
      <AnimatePresence>
        {message && (
          <m.div
            aria-hidden="true"
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="max-w-[170px] rounded-2xl rounded-br-sm border border-cream/10 bg-charcoal-raised px-3.5 py-2.5 text-xs font-semibold text-cream shadow-xl"
          >
            {message}
          </m.div>
        )}
      </AnimatePresence>

      <m.button
        type="button"
        onClick={handleClick}
        aria-label="Get a tip from Ember's mascot"
        className="focus-ring relative flex h-11 w-11 items-center justify-center rounded-full sm:h-16 sm:w-16"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.92 }}
      >
        <m.div
          animate={reacting ? { scale: [1, 1.16, 0.9, 1.05, 1], rotate: [0, -6, 5, -2, 0] } : {}}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]"
        >
          <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-11 w-11 sm:h-16 sm:w-16">
            {/* bottom bun */}
            <path d="M9 41 Q9 54 32 54 Q55 54 55 41 L55 37 L9 37 Z" fill="#d99648" />
            {/* patty */}
            <rect x="7" y="33" width="50" height="7" rx="3.5" fill="#4a2d1c" />
            {/* top bun / face */}
            <path d="M7 33 C7 15 18 5 32 5 C46 5 57 15 57 33 Z" fill="#e3401f" />
            {/* sesame seeds */}
            <ellipse cx="19" cy="13" rx="1.6" ry="2.3" fill="#fff3d6" transform="rotate(-20 19 13)" />
            <ellipse cx="30" cy="8" rx="1.6" ry="2.3" fill="#fff3d6" transform="rotate(5 30 8)" />
            <ellipse cx="43" cy="11" rx="1.6" ry="2.3" fill="#fff3d6" transform="rotate(25 43 11)" />
            <ellipse cx="49" cy="19" rx="1.6" ry="2.3" fill="#fff3d6" transform="rotate(40 49 19)" />
            {/* eyes */}
            <g style={{ transformOrigin: "24px 28px", transform: blinking ? "scaleY(0.12)" : "scaleY(1)", transition: "transform 0.08s ease" }}>
              <circle cx="24" cy="28" r="6.5" fill="#fbf6ee" />
              <circle cx="24" cy="28" r="3.1" fill="#171310" transform={`translate(${pupil.x} ${pupil.y})`} />
            </g>
            <g style={{ transformOrigin: "41px 28px", transform: blinking ? "scaleY(0.12)" : "scaleY(1)", transition: "transform 0.08s ease" }}>
              <circle cx="41" cy="28" r="6.5" fill="#fbf6ee" />
              <circle cx="41" cy="28" r="3.1" fill="#171310" transform={`translate(${pupil.x} ${pupil.y})`} />
            </g>
            {/* smile */}
            <path d="M21 35 Q32.5 41 44 35" stroke="#171310" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          </svg>
        </m.div>
      </m.button>
    </div>
  );
}
