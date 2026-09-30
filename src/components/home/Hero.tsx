"use client";

import { motion, type Transition } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { HeroVideo } from "@/components/home/HeroVideo";

const easeOut: Transition["ease"] = [0.22, 1, 0.36, 1];

export function Hero() {
  function fadeUpTransition(i: number): Transition {
    return { duration: 0.6, delay: i * 0.08, ease: easeOut };
  }
  const fadeUpInitial = { opacity: 0, y: 24 };
  const fadeUpAnimate = { opacity: 1, y: 0 };
  // The H1 and CTAs are server-rendered, so they must be visible at first paint
  // (before hydration): animate position only, never start them at opacity 0.
  const slideUpInitial = { y: 24 };
  const slideUpAnimate = { y: 0 };

  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden bg-charcoal pb-16 pt-28 sm:min-h-[88vh] sm:pb-20 sm:pt-36">
      <div className="absolute inset-0">
        <HeroVideo />
      </div>
      {/* Darkens the video toward the text so copy stays legible without cropping the footage itself. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/55 to-charcoal/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/20 to-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl">
          <motion.p
            initial={fadeUpInitial}
            animate={fadeUpAnimate}
            transition={fadeUpTransition(0)}
            className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-gold"
          >
            Crafted for Cravings
          </motion.p>
          <motion.h1
            initial={slideUpInitial}
            animate={slideUpAnimate}
            transition={fadeUpTransition(1)}
            className="font-display text-[13vw] font-extrabold leading-[0.95] tracking-tight text-cream sm:text-6xl lg:text-7xl"
          >
            BIG FLAVOR.
            <br />
            <span className="text-ember">ZERO BORING</span> BITES.
          </motion.h1>
          <motion.p
            initial={fadeUpInitial}
            animate={fadeUpAnimate}
            transition={fadeUpTransition(2)}
            className="mt-6 max-w-md text-base leading-relaxed text-cream/70 sm:text-lg"
          >
            Burgers, pizza, crispy chicken, loaded sides and everything your cravings have been
            asking for.
          </motion.p>
          <motion.div
            initial={slideUpInitial}
            animate={slideUpAnimate}
            transition={fadeUpTransition(3)}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <ButtonLink href="/menu" size="lg" icon={<ArrowRight size={18} />} iconPosition="right">
              Order Now
            </ButtonLink>
            <ButtonLink href="/menu" size="lg" variant="outline" className="border-cream/25 text-cream hover:border-cream">
              Explore Menu
            </ButtonLink>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
