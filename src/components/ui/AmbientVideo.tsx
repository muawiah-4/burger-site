"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface NetworkInformationLike {
  saveData?: boolean;
}

/**
 * Decorative, muted background loop. Nothing is downloaded until it is allowed to
 * play: `preload="none"` plus a poster means the page only pays for the poster
 * image, and the video file is fetched when the element is near the viewport.
 *
 * It never plays (the poster stays) when the user prefers reduced motion or has
 * Data Saver on, or when the viewport is narrower than `minWidth`. It pauses when
 * scrolled away so off-screen loops don't keep decoding.
 */
export function AmbientVideo({
  webm,
  mp4,
  poster,
  className,
  minWidth,
  rootMargin = "200px 0px",
}: {
  webm: string;
  mp4: string;
  poster: string;
  className?: string;
  /** Only play at or above this viewport width (px); below it the poster is shown. */
  minWidth?: number;
  rootMargin?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wideEnough = minWidth ? window.matchMedia(`(min-width: ${minWidth}px)`) : null;
    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    let inView = false;

    const sync = () => {
      const allowed = !reduceMotion.matches && (wideEnough?.matches ?? true) && !connection?.saveData;
      if (allowed && inView) {
        video.play().catch(() => {
          // Autoplay can be blocked by the browser; the poster still shows.
        });
      } else if (!video.paused) {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin }
    );
    observer.observe(video);
    reduceMotion.addEventListener("change", sync);
    wideEnough?.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      reduceMotion.removeEventListener("change", sync);
      wideEnough?.removeEventListener("change", sync);
    };
  }, [minWidth, rootMargin]);

  return (
    <video
      ref={videoRef}
      className={cn("h-full w-full object-cover", className)}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
    >
      <source src={webm} type="video/webm" />
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
