"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const lineIndex = useRef(0);
  const timeouts = useRef<number[]>([]);
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [reacting, setReacting] = useState(false);
  const [blinking, setBlinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nearFooter, setNearFooter] = useState(false);

  function trackedTimeout(fn: () => void, ms: number) {
    const id = window.setTimeout(fn, ms);
    timeouts.current.push(id);
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

  return (
    <div
      ref={rootRef}
      className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-2 transition-opacity duration-300 sm:bottom-7 sm:right-7"
      style={nearFooter ? { opacity: 0, pointerEvents: "none" } : undefined}
    >
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.92 }}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            className="max-w-[170px] rounded-2xl rounded-br-sm border border-cream/10 bg-charcoal-raised px-3.5 py-2.5 text-xs font-semibold text-cream shadow-xl"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={handleClick}
        aria-label="Ember's mascot — click for a tip"
        className="focus-ring relative flex h-16 w-16 items-center justify-center rounded-full"
        animate={shouldReduceMotion ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ scale: 0.92 }}
      >
        <motion.div
          animate={reacting ? { scale: [1, 1.16, 0.9, 1.05, 1], rotate: [0, -6, 5, -2, 0] } : {}}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="drop-shadow-[0_8px_18px_rgba(0,0,0,0.5)]"
        >
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
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
        </motion.div>
      </motion.button>
    </div>
  );
}
