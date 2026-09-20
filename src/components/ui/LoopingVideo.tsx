"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function LoopingVideo({
  src,
  className,
  ariaLabel,
}: {
  src: string;
  className?: string;
  ariaLabel: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduceMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduceMotion) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay can be blocked by the browser — the poster frame still shows.
      });
    }
  }, [reduceMotion]);

  return (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", className)}
      muted
      loop
      playsInline
      preload="metadata"
      autoPlay={!reduceMotion}
      aria-label={ariaLabel}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
