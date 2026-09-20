"use client";

import { motion, useReducedMotion } from "motion/react";
import { UtensilsCrossed, Settings2, Sparkles } from "lucide-react";

const steps = [
  { number: "01", title: "Choose", desc: "Burgers to shakes — 8 categories, zero filler.", icon: UtensilsCrossed },
  { number: "02", title: "Build", desc: "Patty, cheese, sauce, spice — every chip is yours to flip.", icon: Settings2 },
  { number: "03", title: "Enjoy", desc: "Fired when you order, tracked live to your door.", icon: Sparkles },
];

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden bg-basil py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(244,171,39,0.12), transparent 45%), radial-gradient(circle at 85% 80%, rgba(244,171,39,0.1), transparent 45%)",
        }}
      />
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <p className="text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
          The Process
        </p>
        <h2 className="mt-3 text-center font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          THREE STEPS. ZERO WAIT.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, delay: shouldReduceMotion ? 0 : i * 0.1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream/10 text-gold">
                  <Icon size={26} />
                </div>
                <span className="mt-4 font-display text-xs font-bold tracking-widest text-cream/50">
                  {step.number}
                </span>
                <h3 className="mt-1 font-display text-xl font-extrabold text-cream">{step.title}</h3>
                <p className="mt-1 text-sm text-cream/60">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
