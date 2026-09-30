"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  User,
  Package,
  Gift,
  Flame,
  Check,
  Copy,
  ExternalLink,
  ShoppingBag,
  ChefHat,
  Bike,
} from "lucide-react";
import { useAccountModal } from "@/context/account-modal-context";
import { getAllOrders, deriveStatus, orderDisplayNumber } from "@/lib/orders";
import { PlacedOrder } from "@/types";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useDialog } from "@/hooks/useDialog";
import { getSavedUserProfile, saveUserProfile, SavedUserProfile } from "@/lib/user-profile";

export function AccountModal() {
  const { isOpen, closeAccount, initialTab } = useAccountModal();
  const { applyPromo, openCart } = useCart();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useDialog<HTMLElement>(isOpen, closeAccount);

  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "rewards">(initialTab || "orders");
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [profile, setProfile] = useState<SavedUserProfile>(getSavedUserProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    // Orders and profile live in localStorage, unavailable during SSR — this
    // read can only happen client-side after mount.
    const all = getAllOrders();
    const sorted = Object.values(all).sort(
      (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrders(sorted);
    setProfile(getSavedUserProfile());
    setProfileSaved(false);
  }, [isOpen]);

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    saveUserProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  function handleCopyCode(code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleApplyDeal(code: string) {
    applyPromo(code);
    closeAccount();
    openCart();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="account-backdrop"
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={closeAccount}
          />
          <motion.aside
            key="account-panel"
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            className="fixed inset-y-0 right-0 z-50 flex outline-none h-full w-full max-w-lg flex-col bg-charcoal shadow-2xl"
            initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: shouldReduceMotion ? 0.15 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cream/10 p-5 sm:px-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ember text-cream">
                  <Flame size={18} className="fill-current" />
                </span>
                <div>
                  <h2 id="account-modal-title" className="font-display text-lg font-extrabold text-cream">Ember Account</h2>
                  <p className="text-xs text-cream/60">Orders, saved details & rewards</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeAccount}
                aria-label="Close account modal"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-full text-cream transition hover:bg-cream/10 active:scale-90"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-cream/10 bg-charcoal-raised/50 px-5 pt-2 sm:px-6">
              <button
                type="button"
                onClick={() => setActiveTab("orders")}
                className={`focus-ring flex flex-1 items-center justify-center gap-2 border-b-2 py-3 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "orders"
                    ? "border-ember text-ember-text"
                    : "border-transparent text-cream/60 hover:text-cream"
                }`}
              >
                <Package size={15} />
                Orders {orders.length > 0 && `(${orders.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`focus-ring flex flex-1 items-center justify-center gap-2 border-b-2 py-3 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "profile"
                    ? "border-ember text-ember-text"
                    : "border-transparent text-cream/60 hover:text-cream"
                }`}
              >
                <User size={15} />
                Saved Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rewards")}
                className={`focus-ring flex flex-1 items-center justify-center gap-2 border-b-2 py-3 font-display text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "rewards"
                    ? "border-ember text-ember-text"
                    : "border-transparent text-cream/60 hover:text-cream"
                }`}
              >
                <Gift size={15} />
                Rewards
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* Tab 1: Orders */}
              {activeTab === "orders" && (
                <div>
                  {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-charcoal-soft text-cream/30">
                        <ShoppingBag size={28} />
                      </div>
                      <h3 className="mt-4 font-display text-base font-bold text-cream">No orders yet</h3>
                      <p className="mt-1 max-w-xs text-xs text-cream/60">
                        When you place an order, live tracking details will appear here automatically.
                      </p>
                      <ButtonLink href="/menu" onClick={closeAccount} size="sm" variant="primary" className="mt-5">
                        Explore Menu
                      </ButtonLink>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {orders.map((order) => {
                        const { status } = deriveStatus(order);
                        const statusColors = {
                          preparing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                          cooking: "bg-orange-500/10 text-orange-400 border-orange-500/30",
                          "on-the-way": "bg-blue-500/10 text-blue-400 border-blue-500/30",
                          ready: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                          delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                        };
                        const statusIcon = {
                          preparing: ChefHat,
                          cooking: Flame,
                          "on-the-way": Bike,
                          ready: ShoppingBag,
                          delivered: Check,
                        }[status];
                        const StatusIcon = statusIcon;
                        const statusLabel = {
                          preparing: "Preparing",
                          cooking: "Cooking",
                          "on-the-way": "On the way",
                          ready: "Ready",
                          delivered: "Delivered",
                        }[status];

                        return (
                          <div
                            key={order.id}
                            className="flex flex-col gap-3 rounded-2xl border border-cream/10 bg-charcoal-raised p-4 transition-all hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-display text-sm font-extrabold text-cream">
                                  Order #{orderDisplayNumber(order)}
                                </span>
                                <p className="text-[11px] text-cream/60">
                                  {new Date(order.placedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusColors[status]}`}
                              >
                                <StatusIcon size={11} aria-hidden="true" />
                                {statusLabel}
                              </span>
                            </div>

                            <div className="text-xs text-cream/70">
                              <p className="line-clamp-1 font-medium">
                                {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                              </p>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-cream/60">
                                <span>{order.fulfillment === "delivery" ? "Delivery" : "Pickup"}</span>
                                <span className="font-bold text-cream">{formatPrice(order.total)}</span>
                              </div>
                            </div>

                            <div className="pt-1">
                              <Link
                                href={`/order/${order.id}`}
                                onClick={closeAccount}
                                className="focus-ring flex items-center justify-center gap-1.5 rounded-full border border-cream/15 bg-charcoal-soft py-2 text-xs font-bold text-cream transition-colors hover:border-ember hover:bg-ember-fill hover:text-cream"
                              >
                                <span>Track Order Live</span>
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Profile */}
              {activeTab === "profile" && (
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="rounded-2xl bg-charcoal-raised p-4 border border-cream/10">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-cream/60">
                      Contact Info
                    </h3>
                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <label htmlFor="acct-name" className="text-[11px] font-bold text-cream">Full Name</label>
                        <input
                          type="text"
                          id="acct-name"
                          autoComplete="name"
                          value={profile.name}
                          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          placeholder="e.g. Alex Morgan"
                          className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="acct-phone" className="text-[11px] font-bold text-cream">Phone Number</label>
                        <input
                          type="tel"
                          id="acct-phone"
                          autoComplete="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="e.g. (555) 234-5678"
                          className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                        />
                      </div>
                      <div>
                        <label htmlFor="acct-email" className="text-[11px] font-bold text-cream">Email Address</label>
                        <input
                          type="email"
                          id="acct-email"
                          autoComplete="email"
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          placeholder="alex@example.com"
                          className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-charcoal-raised p-4 border border-cream/10">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-cream/60">
                      Default Delivery Address
                    </h3>
                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <label htmlFor="acct-line1" className="text-[11px] font-bold text-cream">Street Address</label>
                        <input
                          type="text"
                          id="acct-line1"
                          autoComplete="street-address"
                          value={profile.line1}
                          onChange={(e) => setProfile({ ...profile, line1: e.target.value })}
                          placeholder="123 Main St, Apt 4B"
                          className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label htmlFor="acct-city" className="text-[11px] font-bold text-cream">City</label>
                          <input
                            type="text"
                            id="acct-city"
                          autoComplete="address-level2"
                          value={profile.city}
                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                            placeholder="New York"
                            className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                          />
                        </div>
                        <div>
                          <label htmlFor="acct-zip" className="text-[11px] font-bold text-cream">ZIP Code</label>
                          <input
                            type="text"
                            id="acct-zip"
                          autoComplete="postal-code"
                          value={profile.zip}
                            onChange={(e) => setProfile({ ...profile, zip: e.target.value })}
                            placeholder="10001"
                            className="focus-ring mt-1 w-full rounded-xl border border-cream/15 bg-charcoal-soft/50 px-3.5 py-2 text-xs text-cream placeholder:text-cream/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {profileSaved ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                        <Check size={16} /> Saved to device!
                      </span>
                    ) : (
                      <span className="text-[11px] text-cream/60">Pre-fills checkout automatically.</span>
                    )}
                    <Button type="submit" size="sm" variant="primary">
                      Save Profile
                    </Button>
                  </div>
                </form>
              )}

              {/* Tab 3: Rewards */}
              {activeTab === "rewards" && (
                <div className="flex flex-col gap-4">
                  {/* Tier Card */}
                  <div className="rounded-3xl bg-charcoal p-5 text-cream">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-charcoal">
                          <Flame size={16} className="fill-current" />
                        </span>
                        <div>
                          <span className="font-display text-xs font-bold uppercase tracking-wider text-gold">
                            Flame Club Member
                          </span>
                          <h3 className="font-display text-lg font-extrabold">450 Points</h3>
                        </div>
                      </div>
                      <span className="rounded-full bg-cream/15 px-3 py-1 text-[10px] font-bold tracking-widest text-cream">
                        TIER 1
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="h-1.5 w-full rounded-full bg-cream/15">
                        <div className="h-1.5 rounded-full bg-ember" style={{ width: "75%" }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11px] text-cream/60">
                        <span>50 pts to Free Smash Burger</span>
                        <span>500 pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Promo Rewards */}
                  <div className="flex flex-col gap-3">
                    <h3 className="font-display text-xs font-bold uppercase tracking-wider text-cream/60">
                      Exclusive Perks & Promo Codes
                    </h3>

                    {[
                      {
                        code: "CRAVE10",
                        title: "10% Off Entire Order",
                        desc: "Valid on all burgers, pizzas & combos.",
                      },
                      {
                        code: "WELCOME5",
                        title: "$5 Off Orders Over $20",
                        desc: "Great for solo meals and quick lunches.",
                      },
                      {
                        code: "FEAST20",
                        title: "20% Off Weekend Orders Over $40",
                        desc: "Perfect for feeding the squad.",
                      },
                    ].map((promo) => (
                      <div
                        key={promo.code}
                        className="flex flex-col gap-2 rounded-2xl border border-cream/10 bg-charcoal-raised p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-display text-sm font-extrabold text-cream">{promo.title}</p>
                            <p className="text-xs text-cream/60">{promo.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code)}
                            className="focus-ring flex items-center gap-1 rounded-full border border-cream/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cream transition active:scale-95 hover:border-ember hover:text-ember-text"
                          >
                            {copiedCode === promo.code ? (
                              <>
                                <Check size={11} className="text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} />
                                <span>{promo.code}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleApplyDeal(promo.code)}
                          className="mt-1 w-full"
                        >
                          Apply to Cart
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
