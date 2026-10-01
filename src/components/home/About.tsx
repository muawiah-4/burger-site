import { UtensilsCrossed, Settings2, Flame } from "lucide-react";
import { Reveal } from "@/components/ui/Reveal";
import { AmbientVideo } from "@/components/ui/AmbientVideo";
import { SectionHeading } from "@/components/ui/SectionHeading";

// Ember is fictional; these details are invented but kept consistent across the site.
const facts = [
  { value: "2019", label: "First grill lit on Market Street" },
  { value: "Never frozen", label: "Chuck from Hollow Oak Ranch, Sonoma" },
  { value: "6 sauces", label: "Made from scratch every morning" },
  { value: "Fired to order", label: "Nothing waits under a heat lamp" },
];

const steps = [
  { number: "01", title: "Choose", desc: "Eight categories, from smash burgers to thick shakes.", icon: UtensilsCrossed },
  { number: "02", title: "Build", desc: "Patty, cheese, sauce, spice: every choice is yours to make.", icon: Settings2 },
  { number: "03", title: "Eat", desc: "We fire it when you order and track it to your door.", icon: Flame },
];

export function About() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-24" id="about">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] lg:aspect-[4/5]"
        >
          <AmbientVideo
            webm="/videos/about-prep-720p.webm"
            mp4="/videos/about-prep-720p.mp4"
            poster="/videos/about-prep-poster.webp"
          />
        </Reveal>

        <div>
          <SectionHeading label="About Ember" title="Fast Food Deserved Better" />
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-cream/70 sm:text-base">
            Chef Marisol Vega spent twelve years on fine-dining lines before opening a six-stool
            burger counter at 412 Market Street in 2019. Her rule hasn&apos;t changed since:
            if it isn&apos;t worth slowing down for, it isn&apos;t going on the menu.
          </p>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-cream/70 sm:text-base">
            Patties are ground from never-frozen chuck, pizza dough proofs for 48 hours, and
            the sauces are made each morning. We just cook it the moment you order, so it
            still gets to you fast.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-cream/10 pt-6">
            {facts.map((fact) => (
              <div key={fact.label} className="flex flex-col-reverse">
                <dt className="mt-1 text-xs leading-snug text-cream/70">{fact.label}</dt>
                <dd className="font-display text-xl font-extrabold text-cream sm:text-2xl">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* How ordering works, as a compact strip rather than its own section. */}
      <ol className="mt-12 grid grid-cols-1 gap-3 rounded-[2rem] border border-cream/10 bg-charcoal-soft bg-gradient-to-br from-basil/25 via-charcoal-soft to-charcoal-soft p-4 sm:grid-cols-3 sm:p-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.number} className="flex items-start gap-4 rounded-2xl p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream/10 text-gold">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-base font-extrabold text-cream">
                  <span className="mr-2 text-xs font-bold tracking-widest text-gold">{step.number}</span>
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-cream/70">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
