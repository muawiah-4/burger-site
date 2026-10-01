import type { Transition } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { AmbientVideo } from "@/components/ui/AmbientVideo";
import { Reveal } from "@/components/ui/Reveal";

const HERO_POSTER = "/videos/hero-cooking-poster.webp";

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
      {/* The poster is what paints first (and all phones get), so fetch it early. React hoists this into <head>. */}
      <link rel="preload" as="image" href={HERO_POSTER} fetchPriority="high" />
      {/* The footage is a three-panel split. From md up it is scaled from the right edge so the
          left seam sits under the text gradient; the right seam is feathered out below. */}
      <div className="absolute inset-0 md:origin-right md:scale-150">
        <AmbientVideo
          webm="/videos/hero-cooking-720p.webm"
          mp4="/videos/hero-cooking-720p.mp4"
          poster={HERO_POSTER}
          minWidth={768}
        />
      </div>
      {/* Darkens the video toward the text so copy stays legible without cropping the footage itself. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/55 to-charcoal/10" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/40 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-[49.5%] hidden w-72 -translate-x-1/2 bg-gradient-to-r from-transparent via-charcoal/85 to-transparent md:block"
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="max-w-xl">
          <Reveal
            as="p"
            initial={fadeUpInitial}
            animate={fadeUpAnimate}
            transition={fadeUpTransition(0)}
            className="mb-5 inline-block rounded-full bg-charcoal/90 px-3.5 py-1.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] text-ember-text sm:text-xs"
          >
            Burgers, Pizza &amp; Chicken — San Francisco
          </Reveal>
          <Reveal
            as="h1"
            initial={slideUpInitial}
            animate={slideUpAnimate}
            transition={fadeUpTransition(1)}
            className="font-display text-[13vw] font-extrabold leading-[0.95] tracking-tight text-cream sm:text-6xl lg:text-7xl"
          >
            BIG FLAVOR.
            <br />
            <span className="text-ember">ZERO BORING</span> BITES.
          </Reveal>
          <Reveal
            as="p"
            initial={fadeUpInitial}
            animate={fadeUpAnimate}
            transition={fadeUpTransition(2)}
            className="mt-6 max-w-md text-base leading-relaxed text-cream/70 sm:text-lg"
          >
            Burgers, pizza, crispy chicken, loaded sides and everything your cravings have been
            asking for.
          </Reveal>
          <Reveal
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
          </Reveal>
        </div>
      </div>
    </section>
  );
}
