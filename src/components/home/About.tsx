"use client";

import { motion, useReducedMotion } from "motion/react";
import { LoopingVideo } from "@/components/ui/LoopingVideo";

const stats = [
  { value: "8", label: "Menu Categories" },
  { value: "4", label: "City Locations" },
  { value: "0", label: "Shortcuts Taken" },
];

export function About() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28" id="about">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem]"
        >
          <LoopingVideo src="/videos/about-prep.mp4" ariaLabel="A cook placing a fresh beef patty into a hot cast-iron pan" />
        </motion.div>

        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ember">About Ember</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl lg:text-5xl">
            FAST FOOD DESERVED BETTER.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-cream/60 sm:text-base">
            Ember started with a simple complaint: why does fast have to mean forgettable? We
            build every item like it belongs on a tasting menu, then get it to you in minutes,
            not courses.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream/60 sm:text-base">
            No frozen shortcuts, no phoned-in flavor. Just bold, original recipes made when you
            order — for students, crews, families and anyone who refuses to eat something
            boring.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-cream/10 pt-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="font-display text-3xl font-extrabold text-cream sm:text-4xl">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-cream/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
