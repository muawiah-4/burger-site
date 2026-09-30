"use client";

import { useState, FormEvent, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, Smartphone, QrCode, Check, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useScrollLock } from "@/hooks/useScrollLock";

export function AppDownloadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  useScrollLock(isOpen);
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    // Resets form state each time the modal reopens (it stays mounted between opens).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSent(false);
    setError("");
    setInstalled(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    setError("");
    setSent(true);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="app-backdrop"
            className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Download Ember App"
              className="relative w-full max-w-md rounded-3xl bg-charcoal p-6 shadow-2xl sm:p-8"
              initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="focus-ring absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-cream/60 transition hover:bg-cream/10 hover:text-cream"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ember/10 text-ember">
                  <Smartphone size={24} />
                </span>
                <h3 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-cream">
                  GET THE EMBER APP
                </h3>
                <p className="mt-1 text-xs text-cream/60">
                  Instant ordering, real-time GPS tracking, and exclusive secret menu items.
                </p>
              </div>

              {/* QR Code Graphic */}
              <div className="mt-6 flex flex-col items-center justify-center rounded-2xl bg-charcoal-raised p-5 border border-cream/10">
                <div className="flex h-36 w-36 items-center justify-center rounded-xl bg-charcoal p-3 text-cream">
                  {/* Stylized QR representation */}
                  <div className="grid grid-cols-5 gap-1.5 w-full h-full p-1 bg-charcoal-raised rounded-lg">
                    <div className="bg-charcoal rounded-sm col-span-2 row-span-2" />
                    <div className="bg-ember rounded-sm col-span-1 row-span-1" />
                    <div className="bg-charcoal rounded-sm col-span-2 row-span-2" />
                    <div className="bg-charcoal rounded-sm col-span-1 row-span-1" />
                    <div className="bg-gold rounded-sm col-span-1 row-span-1" />
                    <div className="bg-charcoal rounded-sm col-span-1 row-span-1" />
                    <div className="bg-ember rounded-sm col-span-1 row-span-1" />
                    <div className="bg-charcoal rounded-sm col-span-2 row-span-2" />
                    <div className="bg-charcoal rounded-sm col-span-1 row-span-1" />
                    <div className="bg-gold rounded-sm col-span-2 row-span-2" />
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wider text-cream/70">
                  <QrCode size={14} /> Scan with your phone camera
                </p>
              </div>

              {/* Text Me the Link */}
              <div className="mt-5">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-cream/60 text-center">
                  Or text a direct link to your phone
                </p>
                {sent ? (
                  <div className="mt-2.5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-400">
                    <Check size={16} /> Link sent to {phone}! Check your SMS.
                  </div>
                ) : (
                  <form onSubmit={handleSend} className="mt-2.5 flex gap-2">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="focus-ring flex-1 rounded-full border border-cream/15 bg-charcoal-raised px-4 py-2 text-xs text-cream placeholder:text-cream/60"
                    />
                    <Button type="submit" size="sm" variant="primary">
                      <Send size={13} className="mr-1 inline" /> Send
                    </Button>
                  </form>
                )}
                {error && <p className="mt-1.5 text-center text-xs text-ember font-semibold">{error}</p>}
              </div>

              {installed ? (
                <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-400">
                  <Check size={16} /> Installed! Find Ember on your home screen.
                </div>
              ) : (
                <div className="mt-6 flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="focus-ring flex-1 rounded-full border border-cream/15 bg-charcoal-raised py-2 text-center text-xs font-bold text-cream transition hover:border-ember"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstalled(true)}
                    className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-full bg-charcoal py-2 text-xs font-bold text-cream transition hover:bg-ember"
                  >
                    <Sparkles size={13} /> Install PWA
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
