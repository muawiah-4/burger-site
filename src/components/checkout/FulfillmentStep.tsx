"use client";

import { Bike, ShoppingBag, Check, Clock, CalendarClock } from "lucide-react";
import { FulfillmentMethod } from "@/types";
import { cn } from "@/lib/utils";
import { formatSlot } from "@/lib/schedule";

export function FulfillmentStep({
  value,
  onChange,
  slots,
  hoursLabel,
  scheduledFor,
  onScheduleChange,
  scheduleError,
}: {
  value: FulfillmentMethod;
  onChange: (v: FulfillmentMethod) => void;
  /** Today's available slots (see lib/schedule). */
  slots: Date[];
  /** e.g. "Ember Downtown, 10:00 AM – 12:00 AM" */
  hoursLabel: string;
  scheduledFor: string | null;
  onScheduleChange: (iso: string | null) => void;
  scheduleError?: string;
}) {
  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">How do you want it?</h2>
      <p className="mt-1 text-sm text-cream/60">Choose delivery or pickup for this order.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            { id: "delivery", label: "Delivery", desc: "Brought straight to your door.", icon: Bike },
            { id: "pickup", label: "Pickup", desc: "Grab it fresh, skip the wait.", icon: ShoppingBag },
          ] as const
        ).map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={cn(
                "focus-ring relative flex flex-col items-start gap-3 rounded-3xl border-2 p-6 text-left transition-all active:scale-[0.98]",
                active ? "border-ember bg-ember/5" : "border-cream/10 bg-charcoal-raised hover:border-cream/25"
              )}
            >
              {active && (
                <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-ember text-cream">
                  <Check size={13} />
                </span>
              )}
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  active ? "bg-ember-fill text-cream" : "bg-cream/5 text-cream"
                )}
              >
                <Icon size={22} />
              </span>
              <div>
                <p className="font-display text-base font-extrabold text-cream">{opt.label}</p>
                <p className="text-sm text-cream/60">{opt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <fieldset className="mt-8">
        <legend className="font-display text-sm font-extrabold uppercase tracking-wide text-cream">When</legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="When">
          <WhenOption
            active={scheduledFor === null}
            onClick={() => onScheduleChange(null)}
            icon={<Clock size={18} />}
            label="ASAP"
            desc={value === "delivery" ? "Delivered in about 25–35 min." : "Ready in about 12–18 min."}
          />
          <WhenOption
            active={scheduledFor !== null}
            disabled={slots.length === 0}
            onClick={() => onScheduleChange(slots[0]?.toISOString() ?? null)}
            icon={<CalendarClock size={18} />}
            label="Schedule for later"
            desc={slots.length === 0 ? "No more slots today." : "Pick a time later today."}
          />
        </div>
        {scheduledFor !== null && slots.length > 0 && (
          <div className="mt-4">
            <label htmlFor="checkout-schedule" className="text-xs font-semibold text-cream/70">
              Time today
            </label>
            <select
              id="checkout-schedule"
              value={scheduledFor}
              onChange={(e) => onScheduleChange(e.target.value)}
              aria-invalid={scheduleError ? true : undefined}
              aria-describedby={scheduleError ? "checkout-schedule-error checkout-schedule-hint" : "checkout-schedule-hint"}
              className="focus-ring mt-1.5 block w-full rounded-2xl border border-cream/15 bg-charcoal-raised px-4 py-3 text-sm text-cream sm:w-64"
            >
              {/* A restored time that is no longer offered stays selectable until changed. */}
              {!slots.some((s) => s.toISOString() === scheduledFor) && (
                <option value={scheduledFor}>{formatSlot(new Date(scheduledFor))} (unavailable)</option>
              )}
              {slots.map((slot) => (
                <option key={slot.toISOString()} value={slot.toISOString()}>
                  {formatSlot(slot)}
                </option>
              ))}
            </select>
            <p id="checkout-schedule-hint" className="mt-1.5 text-xs text-cream/60">
              15-minute slots, at least 30 min from now · {hoursLabel}
            </p>
            {scheduleError && (
              <p id="checkout-schedule-error" role="alert" className="mt-1 text-xs font-semibold text-ember-text">
                {scheduleError}
              </p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}

function WhenOption({
  active,
  disabled,
  onClick,
  icon,
  label,
  desc,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.98] disabled:opacity-50",
        active ? "border-ember bg-ember/5" : "border-cream/10 bg-charcoal-raised hover:border-cream/25"
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          active ? "bg-ember-fill text-cream" : "bg-cream/5 text-cream"
        )}
      >
        {icon}
      </span>
      <span>
        <span className="block font-display text-sm font-extrabold text-cream">{label}</span>
        <span className="block text-xs text-cream/60">{desc}</span>
      </span>
    </button>
  );
}
