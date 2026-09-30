"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { getImageProps } from "next/image";
import { motion, useReducedMotion } from "motion/react";

interface Flight {
  id: string;
  imgSrc: string;
  fromRect: DOMRect;
  toRect: DOMRect;
}

interface FlyToCartContextValue {
  registerCartIcon: (el: HTMLElement | null) => void;
  registerMobileCartIcon: (el: HTMLElement | null) => void;
  launch: (fromEl: HTMLElement | null, imgSrc: string) => void;
  landSignal: number;
}

const FlyToCartContext = createContext<FlyToCartContextValue | null>(null);

function pickVisibleTarget(a: HTMLElement | null, b: HTMLElement | null): HTMLElement | null {
  if (a && a.getClientRects().length > 0) return a;
  if (b && b.getClientRects().length > 0) return b;
  return null;
}

export function FlyToCartProvider({ children }: { children: React.ReactNode }) {
  const desktopIconRef = useRef<HTMLElement | null>(null);
  const mobileIconRef = useRef<HTMLElement | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [landSignal, setLandSignal] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  const registerCartIcon = useCallback((el: HTMLElement | null) => {
    desktopIconRef.current = el;
  }, []);
  const registerMobileCartIcon = useCallback((el: HTMLElement | null) => {
    mobileIconRef.current = el;
  }, []);

  const launch = useCallback(
    (fromEl: HTMLElement | null, imgSrc: string) => {
      const target = pickVisibleTarget(desktopIconRef.current, mobileIconRef.current);
      if (!fromEl || !target) return;

      if (shouldReduceMotion) {
        // Skip the flight animation, but still let the cart badge react.
        setLandSignal((s) => s + 1);
        return;
      }

      const fromRect = fromEl.getBoundingClientRect();
      const toRect = target.getBoundingClientRect();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setFlights((prev) => [...prev, { id, imgSrc: flightImageSrc(fromEl, imgSrc, fromRect.width), fromRect, toRect }]);
    },
    [shouldReduceMotion]
  );

  const complete = useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
    setLandSignal((s) => s + 1);
  }, []);

  return (
    <FlyToCartContext.Provider value={{ registerCartIcon, registerMobileCartIcon, launch, landSignal }}>
      {children}
      <div aria-hidden="true">
        {flights.map((flight) => (
          <FlightImage key={flight.id} flight={flight} onDone={() => complete(flight.id)} />
        ))}
      </div>
    </FlyToCartContext.Provider>
  );
}

/**
 * Remote photos must go through the /_next/image optimizer: the CSP only allows
 * same-origin images. Reuse the modal's already-loaded optimized URL when there is
 * one (it's cached, so the flight starts instantly), else build one.
 */
function flightImageSrc(fromEl: HTMLElement, src: string, width: number): string {
  const rendered = fromEl.querySelector("img")?.currentSrc;
  if (rendered && new URL(rendered, window.location.href).origin === window.location.origin) return rendered;
  const size = Math.max(64, Math.round(width));
  return getImageProps({ src, alt: "", width: size, height: size, sizes: `${size}px` }).props.src;
}

function FlightImage({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const { fromRect, toRect, imgSrc } = flight;
  const fromCenterX = fromRect.left + fromRect.width / 2;
  const fromCenterY = fromRect.top + fromRect.height / 2;
  const toCenterX = toRect.left + toRect.width / 2;
  const toCenterY = toRect.top + toRect.height / 2;
  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  return (
    <motion.img
      src={imgSrc}
      alt=""
      style={{
        position: "fixed",
        left: fromRect.left,
        top: fromRect.top,
        width: fromRect.width,
        height: fromRect.height,
        borderRadius: "1.5rem",
        objectFit: "cover",
        zIndex: 100,
        pointerEvents: "none",
      }}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
      animate={{
        x: [0, dx * 0.55, dx],
        y: [0, dy * 0.35 - 60, dy],
        scale: [1, 0.55, 0.1],
        opacity: [1, 1, 0.4],
      }}
      transition={{ duration: 0.7, ease: [0.36, 0, 0.66, 1] }}
      onAnimationComplete={onDone}
    />
  );
}

export function useFlyToCart(): FlyToCartContextValue {
  const ctx = useContext(FlyToCartContext);
  if (!ctx) throw new Error("useFlyToCart must be used within FlyToCartProvider");
  return ctx;
}
