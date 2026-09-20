"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "motion/react";
import { Search, User, ShoppingBag, Menu as MenuIcon, X, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useFlyToCart } from "@/context/fly-to-cart-context";
import { useAccountModal } from "@/context/account-modal-context";
import { Button, ButtonLink } from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/#deals", label: "Deals" },
  { href: "/#about", label: "About" },
  { href: "/#locations", label: "Locations" },
];

export function Navbar() {
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const { openAccount } = useAccountModal();
  const { registerCartIcon, registerMobileCartIcon, landSignal } = useFlyToCart();
  const pathname = usePathname();
  const badgeControls = useAnimationControls();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (landSignal === 0) return;
    // Confirms the item just landed in the cart — skip the scale punch for
    // reduced-motion users, the updated count is still the static affordance.
    if (shouldReduceMotion) return;
    badgeControls.start({ scale: [1, 1.45, 1] }, { duration: 0.4, ease: "easeOut" });
  }, [landSignal, badgeControls, shouldReduceMotion]);

  // Only the homepage has a dark hero behind the navbar for the transparent
  // treatment to work against — every other page needs the solid bar from the start.
  const hasDarkHero = pathname === "/";
  const scrolled = !hasDarkHero || scrolledPastHero;

  useEffect(() => {
    if (!hasDarkHero) return;
    const onScroll = () => setScrolledPastHero(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasDarkHero]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const textTone = "text-cream";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-charcoal/95 shadow-[0_1px_0_rgba(237,239,219,0.08)] backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="focus-ring flex items-center gap-2" aria-label="Ember home">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full bg-ember text-cream transition-colors"
            )}
          >
            <Flame size={18} className="fill-current" />
          </span>
          <span className={cn("font-display text-lg font-extrabold tracking-tight", textTone)}>EMBER</span>
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "focus-ring font-display text-xs font-bold uppercase tracking-wider transition-colors hover:text-ember",
                  textTone
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/menu?focus=search"
            aria-label="Search menu"
            className={cn("focus-ring transition-all active:scale-90 hover:text-ember", textTone)}
          >
            <Search size={19} />
          </Link>
          <button
            type="button"
            aria-label="Account"
            onClick={openAccount}
            className={cn("focus-ring transition-all active:scale-90 hover:text-ember", textTone)}
          >
            <User size={19} />
          </button>
          <button
            ref={registerCartIcon}
            aria-label={`Cart, ${itemCount} items`}
            onClick={openCart}
            className={cn("focus-ring relative transition-all active:scale-90 hover:text-ember", textTone)}
          >
            <ShoppingBag size={19} />
            {itemCount > 0 && (
              <motion.span
                animate={badgeControls}
                className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-cream"
              >
                {itemCount}
              </motion.span>
            )}
          </button>
          <ButtonLink href="/menu" size="sm">
            Order Now
          </ButtonLink>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <button
            ref={registerMobileCartIcon}
            aria-label={`Cart, ${itemCount} items`}
            onClick={openCart}
            className={cn("focus-ring relative transition-transform active:scale-90", textTone)}
          >
            <ShoppingBag size={22} />
            {itemCount > 0 && (
              <motion.span
                animate={badgeControls}
                className="absolute -right-2 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-cream"
              >
                {itemCount}
              </motion.span>
            )}
          </button>
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className={cn("focus-ring transition-transform active:scale-90", textTone)}
          >
            <MenuIcon size={24} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-charcoal/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-cream/10 bg-charcoal p-6 shadow-2xl"
              initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="font-display text-lg font-extrabold text-cream">MENU</span>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                  className="focus-ring text-cream transition-transform active:scale-90"
                >
                  <X size={24} />
                </button>
              </div>
              <ul className="flex flex-col gap-6">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="focus-ring font-display text-2xl font-extrabold text-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-3">
                <ButtonLink href="/menu" size="lg" onClick={() => setMobileOpen(false)}>
                  Order Now
                </ButtonLink>
                <Button variant="outline" size="lg" onClick={() => setMobileOpen(false)}>
                  <User size={16} /> Account
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
