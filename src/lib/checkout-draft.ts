import { CustomerInfo, DeliveryAddress, PaymentMethod } from "@/types";
import { isRecord } from "@/lib/storage-shared";
import { NO_TIP, parseTipChoice, TipChoice } from "@/lib/tip";

/**
 * In-progress checkout, kept in sessionStorage so a refresh doesn't lose it.
 * No card details (number, expiry, CVC or name on card) are ever stored.
 */
export const CHECKOUT_DRAFT_KEY = "ember.checkout.draft.v1";

export interface CheckoutDraft {
  step: number;
  customer: CustomerInfo;
  address: DeliveryAddress;
  payment: PaymentMethod;
  tip: TipChoice;
  scheduledFor: string | null;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : "");

export function readCheckoutDraft(): CheckoutDraft | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return null;
    const c = isRecord(v.customer) ? v.customer : {};
    const a = isRecord(v.address) ? v.address : {};
    const step = typeof v.step === "number" && Number.isInteger(v.step) ? Math.min(Math.max(v.step, 1), 5) : 1;
    const payment: PaymentMethod = v.payment === "cash" || v.payment === "wallet" ? v.payment : "card";
    return {
      step,
      customer: { name: str(c.name), phone: str(c.phone), email: str(c.email) },
      address: {
        line1: str(a.line1),
        line2: str(a.line2),
        city: str(a.city),
        zip: str(a.zip),
        instructions: str(a.instructions, 500),
      },
      payment,
      tip: v.tip === undefined ? NO_TIP : parseTipChoice(v.tip),
      scheduledFor: typeof v.scheduledFor === "string" ? v.scheduledFor : null,
    };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  try {
    sessionStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // storage unavailable or full: the draft is a convenience only
  }
}

export function clearCheckoutDraft(): void {
  try {
    sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    // ignore
  }
}
