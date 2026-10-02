import Link from "next/link";
import { Flame } from "lucide-react";

function SocialIcon({ path }: { path: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ember is a demo with no policy or support pages, so there are no "#" links:
// entries without a real destination (href: null) render as plain text.
const columns: { title: string; links: { label: string; href: string | null }[] }[] = [
  {
    title: "Ember",
    links: [
      { label: "Menu", href: "/menu" },
      { label: "Deals", href: "/#deals" },
      { label: "About", href: "/#about" },
      { label: "Locations", href: "/#locations" },
    ],
  },
  {
    title: "Customer",
    links: [
      { label: "Track Order", href: "/order/latest" },
      { label: "Delivery", href: "/#locations" },
      { label: "Pickup", href: "/#locations" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: null },
      { label: "Terms", href: null },
      { label: "Cookies", href: null },
      { label: "Contact", href: null },
      { label: "FAQ", href: null },
    ],
  },
];

export function Footer() {
  return (
    <footer id="site-footer" className="bg-charcoal text-cream">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="focus-ring flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-cream">
                <Flame size={18} className="fill-current" />
              </span>
              <span className="font-display text-lg font-extrabold">EMBER</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/60">
              Smash burgers, stone-baked pizza and crispy chicken, cooked to order in San Francisco
              since 2019.
            </p>
            {/* Decorative: the brand is fictional and has no social accounts to link to. */}
            <div className="mt-6 flex items-center gap-4" aria-hidden="true">
              <span className="text-cream/60">
                <SocialIcon path="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5-1.5h.01" />
              </span>
              <span className="text-cream/60">
                <SocialIcon path="M16.5 3v9.6a4.4 4.4 0 1 1-4.4-4.4c.16 0 .32.01.48.03V11a2.4 2.4 0 1 0 1.6 2.26V3h2.32a4.28 4.28 0 0 0 3.5 4.2v2.3a6.7 6.7 0 0 1-3.5-1.2Z" />
              </span>
              <span className="text-cream/60">
                <SocialIcon path="M14 9h3V6h-3a3 3 0 0 0-3 3v2H9v3h2v6h3v-6h2.5l.5-3H14V9Z" />
              </span>
              <span className="text-cream/60">
                <SocialIcon path="M4 4l16 16M20 4L4 20" />
              </span>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-cream/60">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="focus-ring text-sm text-cream/70 transition hover:text-cream"
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-cream/60">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 border-t border-cream/10 pt-6 text-xs text-cream/60">
          <p>© {new Date().getFullYear()} Ember Foods Co. All rights reserved.</p>
          <p className="mt-2 max-w-2xl text-[11px] leading-relaxed">
            Ember is a fictional restaurant brand built as a demo. Its people, ranch, locations
            and reviews are invented, and no real orders, payments or emails are processed.
          </p>
        </div>
      </div>
    </footer>
  );
}
