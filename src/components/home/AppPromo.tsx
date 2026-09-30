"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Zap, MapPinned, Heart, Tag, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Marquee } from "@/components/ui/Marquee";
import dynamic from "next/dynamic";
import { useOpenedOnce } from "@/hooks/useOpenedOnce";

// Fetched the first time "Get the App" is pressed.
const AppDownloadModal = dynamic(() => import("./AppDownloadModal").then((m) => m.AppDownloadModal), { ssr: false });

const perks = [
  { icon: Zap, label: "Order faster" },
  { icon: MapPinned, label: "Track orders" },
  { icon: Heart, label: "Save favorite meals" },
  { icon: Tag, label: "Get exclusive deals" },
];

const TICKER_ITEMS = [
  "MADE FRESH WHEN YOU ORDER",
  "ZERO FROZEN SHORTCUTS",
  "BIG FLAVOR, ZERO BORING BITES",
  "HOT OFF THE GRILL, FAST TO YOUR DOOR",
];

export function AppPromo() {
  const [modalOpen, setModalOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const modalOpened = useOpenedOnce(modalOpen);

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-charcoal">
          <div className="grid grid-cols-1 items-center gap-10 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-cream sm:text-4xl">
                YOUR CRAVINGS, ONE TAP AWAY.
              </h2>
              <ul className="mt-6 flex flex-col gap-3">
                {perks.map((perk) => {
                  const Icon = perk.icon;
                  return (
                    <li key={perk.label} className="flex items-center gap-3 text-cream/70">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream/10 text-ember">
                        <Icon size={16} />
                      </span>
                      <span className="text-sm font-medium">{perk.label}</span>
                    </li>
                  );
                })}
              </ul>
              <Button variant="primary" size="lg" className="mt-8" onClick={() => setModalOpen(true)}>
                Get the App
              </Button>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative mx-auto"
            >
              {/* Ambient glow bleeding behind the phone */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 scale-125 rounded-full bg-ember/25 blur-[70px]"
              />

              {/* Phone frame */}
              <div className="relative flex h-80 w-44 flex-col overflow-hidden rounded-[2.25rem] border-4 border-cream-soft bg-[#0e0b09] shadow-2xl sm:h-[22rem] sm:w-48">
                {/* Notch */}
                <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-black/80" />

                {/* Status row */}
                <div className="flex items-center justify-between px-5 pt-6">
                  <span className="font-display text-[10px] font-bold uppercase tracking-widest text-gold">
                    Ember.App
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </div>

                {/* Glowing icon */}
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
                  <div className="relative flex items-center justify-center">
                    <motion.span
                      aria-hidden="true"
                      className="absolute h-20 w-20 rounded-full bg-ember blur-2xl"
                      // Fixed initial keeps the server and client markup identical; the
                      // reduced-motion branch below only affects the (client-side) animation.
                      initial={{ opacity: 0.55, scale: 1 }}
                      animate={
                        shouldReduceMotion
                          ? { opacity: 0.55 }
                          : { opacity: [0.45, 0.7, 0.45], scale: [1, 1.12, 1] }
                      }
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <span
                      className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-ember text-cream"
                      style={{ boxShadow: "0 0 40px 8px rgba(227,64,31,0.55)" }}
                    >
                      <Flame size={30} className="fill-current" />
                    </span>
                  </div>
                  <p className="text-center font-display text-sm font-extrabold text-cream">Ember Rewards</p>
                  <p className="text-center text-[11px] text-cream/60">Scan to earn double points</p>
                </div>

                {/* Promo chip */}
                <div className="mx-4 mb-5 rounded-2xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-center">
                  <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-gold">
                    <Sparkles size={12} /> 10% OFF CODE: CRAVE10
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <Marquee items={TICKER_ITEMS} />
        </div>
      </section>

      {modalOpened && <AppDownloadModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />}
    </>
  );
}
