"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CustomerInfo, DeliveryAddress, PaymentMethod } from "@/types";
import type { CreateOrderRequest } from "@/lib/api-types";
import {
  ApiError,
  buildQuoteRequest,
  newIdempotencyKey,
  orderHref,
  placeOrderRequest,
  saveOrderRef,
} from "@/lib/order-client";
import { formatPrice } from "@/lib/utils";
import { getSavedUserProfile } from "@/lib/user-profile";
import {
  isValidCardNumber,
  isValidCvc,
  isValidEmail,
  isValidExpiry,
  isValidName,
  isValidPhone,
  isValidZip,
} from "@/lib/validation";
import { StepIndicator } from "@/components/checkout/StepIndicator";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { FulfillmentStep } from "@/components/checkout/FulfillmentStep";
import { CustomerStep } from "@/components/checkout/CustomerStep";
import { AddressStep } from "@/components/checkout/AddressStep";
import { PaymentStep, CardDetails } from "@/components/checkout/PaymentStep";
import { ReviewStep } from "@/components/checkout/ReviewStep";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { DemoNotice } from "@/components/ui/DemoNotice";
import { locations } from "@/lib/data/locations";
import { computeTip, NO_TIP, TipChoice } from "@/lib/tip";
import { generateTimeSlots } from "@/lib/schedule";
import { clearCheckoutDraft, readCheckoutDraft, saveCheckoutDraft } from "@/lib/checkout-draft";

const EMPTY_ADDRESS: DeliveryAddress = { line1: "", line2: "", city: "", zip: "", instructions: "" };
const EMPTY_CUSTOMER: CustomerInfo = { name: "", phone: "", email: "" };
const EMPTY_CARD: CardDetails = { name: "", number: "", expiry: "", cvc: "" };

// Field ids in the order they appear, so a failed Continue can focus the first invalid one.
const CUSTOMER_FIELD_IDS: Record<keyof CustomerInfo, string> = {
  name: "checkout-name",
  phone: "checkout-phone",
  email: "checkout-email",
};
const ADDRESS_FIELD_IDS: Partial<Record<keyof DeliveryAddress, string>> = {
  line1: "checkout-line1",
  city: "checkout-city",
  zip: "checkout-zip",
};
const CARD_FIELD_IDS: Record<keyof CardDetails, string> = {
  name: "checkout-cc-name",
  number: "checkout-cc-number",
  expiry: "checkout-cc-exp",
  cvc: "checkout-cc-csc",
};

function firstInvalidId<K extends string>(errors: Partial<Record<K, string>>, ids: Partial<Record<K, string>>) {
  const key = (Object.keys(ids) as K[]).find((k) => errors[k]);
  return key ? ids[key] : undefined;
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);
  // Guards against a second click landing before React re-renders with placing=true.
  const placingRef = useRef(false);
  // The total shown on Place Order: the server's total after a 409, and a snapshot
  // while submitting (clearCart() zeroes cart.totals while we navigate away).
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const idempotency = useRef<{ key: string; body: string } | null>(null);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);
  // The tip choice is sent with the order; the server computes the amount and includes it in the total.
  const [tipChoice, setTipChoice] = useState<TipChoice>(NO_TIP);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | undefined>();
  const [now, setNow] = useState(() => new Date());
  // The draft is restored once the cart has hydrated; saving waits for that so the
  // initial empty state never overwrites it.
  const [draftRestored, setDraftRestored] = useState(false);

  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});
  // Set after a failed Continue; focused once the errors have rendered so AT reads them with the field.
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);
  // Each step panel remounts (keyed by step). On every mount after the first, move
  // focus to its heading so keyboard/AT users aren't left on a removed button.
  const stepPanelMounted = useRef(false);
  const stepPanelRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    if (!stepPanelMounted.current) {
      stepPanelMounted.current = true;
      return;
    }
    const heading = el.querySelector("h2");
    if (!heading) return;
    heading.tabIndex = -1;
    heading.classList.add("outline-none");
    heading.focus({ preventScroll: true });
  }, []);
  // True after "Edit" on the Review step: Continue then returns to Review once valid.
  const [editingFromReview, setEditingFromReview] = useState(false);

  useEffect(() => {
    if (!focusRequest) return;
    const el = document.getElementById(focusRequest.id);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: shouldReduceMotion ? "auto" : "smooth" });
  }, [focusRequest, shouldReduceMotion]);

  useEffect(() => {
    // Pre-fill from the profile saved in the Account modal, without overwriting
    // anything already typed. localStorage is client-only, hence the effect.
    const profile = getSavedUserProfile();
    /* eslint-disable react-hooks/set-state-in-effect */
    setCustomer((c) => ({
      name: c.name || profile.name,
      phone: c.phone || profile.phone,
      email: c.email || profile.email,
    }));
    setAddress((a) => ({
      ...a,
      line1: a.line1 || profile.line1,
      city: a.city || profile.city,
      zip: a.zip || profile.zip,
    }));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const scheduleLocation =
    (cart.fulfillment === "pickup" && locations.find((l) => l.id === cart.pickupLocationId)) || locations[0];
  const slots = useMemo(() => generateTimeSlots(now, scheduleLocation.hours), [now, scheduleLocation.hours]);
  const tipCents =
    cart.fulfillment === "delivery" ? computeTip(Math.round(cart.totals.subtotal * 100), tipChoice) : 0;
  const tip = tipCents / 100;

  useEffect(() => {
    if (!cart.hydrated || draftRestored) return;
    const draft = readCheckoutDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (draft) {
      // Draft values win; blanks fall back to the saved profile, like the prefill above.
      const profile = getSavedUserProfile();
      const restoredCustomer = {
        name: draft.customer.name || profile.name,
        phone: draft.customer.phone || profile.phone,
        email: draft.customer.email || profile.email,
      };
      const restoredAddress = {
        line1: draft.address.line1 || profile.line1,
        line2: draft.address.line2,
        city: draft.address.city || profile.city,
        zip: draft.address.zip || profile.zip,
        instructions: draft.address.instructions,
      };
      setCustomer(restoredCustomer);
      setAddress(restoredAddress);
      setPayment(draft.payment);
      setTipChoice(draft.tip);
      // A saved time that has since passed (or is too close) falls back to ASAP.
      const stillOffered =
        draft.scheduledFor !== null && slots.some((s) => s.toISOString() === draft.scheduledFor);
      setScheduledFor(stillOffered ? draft.scheduledFor : null);
      // Resume at the saved step, unless an earlier step is no longer complete.
      // Card numbers are never saved, so a card payment resumes on the Payment step.
      let resume = draft.step;
      const customerOk =
        isValidName(restoredCustomer.name) && isValidPhone(restoredCustomer.phone) && isValidEmail(restoredCustomer.email);
      const addressOk =
        cart.fulfillment === "pickup"
          ? !!cart.pickupLocationId
          : !!restoredAddress.line1.trim() && !!restoredAddress.city.trim() && isValidZip(restoredAddress.zip);
      if (resume > 2 && !customerOk) resume = 2;
      if (resume > 3 && !addressOk) resume = 3;
      if (resume > 4 && draft.payment === "card") resume = 4;
      setStep(resume);
    }
    setDraftRestored(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Runs once, after hydration; the values read here are the initial ones.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.hydrated]);

  useEffect(() => {
    if (!draftRestored || placingRef.current) return;
    saveCheckoutDraft({
      step,
      customer,
      address,
      payment,
      tip: tipChoice,
      scheduledFor,
    });
  }, [draftRestored, step, customer, address, payment, tipChoice, scheduledFor]);

  useEffect(() => {
    // Wait for the cart to finish reading localStorage before deciding it's
    // empty — otherwise a hard reload on this page bounces straight to /menu.
    if (cart.hydrated && !placing && cart.items.length === 0) {
      router.replace("/menu");
    }
  }, [cart.hydrated, cart.items.length, placing, router]);

  function customerErrorsFor(): Partial<Record<keyof CustomerInfo, string>> {
    const errors: Partial<Record<keyof CustomerInfo, string>> = {};
    if (!isValidName(customer.name)) errors.name = "We need your name to fire your order.";
    if (!isValidPhone(customer.phone)) errors.phone = "Add a phone number we can reach you on (at least 7 digits).";
    if (!isValidEmail(customer.email)) errors.email = "That email doesn't look right. Try again?";
    return errors;
  }

  function addressErrorsFor(): Partial<Record<keyof DeliveryAddress, string>> {
    if (cart.fulfillment === "pickup") {
      return cart.pickupLocationId ? {} : { line1: "Pick a kitchen so we know where to fire your order." };
    }
    const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
    if (!address.line1.trim()) errors.line1 = "Where's it going? Add your street address.";
    if (!address.city.trim()) errors.city = "Add your city so the driver finds you.";
    if (!isValidZip(address.zip)) errors.zip = "That ZIP doesn't look right. Use 5 digits, like 94103.";
    return errors;
  }

  function cardErrorsFor(): Partial<Record<keyof CardDetails, string>> {
    if (payment !== "card") return {};
    const errors: Partial<Record<keyof CardDetails, string>> = {};
    if (!isValidName(card.name)) errors.name = "Add the name exactly as it's printed on the card.";
    if (!isValidCardNumber(card.number)) errors.number = "That card number doesn't look right. Use the test card 4242 4242 4242 4242.";
    if (!isValidExpiry(card.expiry)) errors.expiry = "Use a future date in MM/YY format, like 08/28.";
    if (!isValidCvc(card.cvc)) errors.cvc = "The CVC is the 3 or 4 digits on the back of the card.";
    return errors;
  }

  const hasErrors = (errors: object) => Object.keys(errors).length > 0;

  /** Is a step complete? Pure — used to decide where an edit from Review should land. */
  function stepIsValid(n: number) {
    if (n === 2) return !hasErrors(customerErrorsFor());
    if (n === 3) return !hasErrors(addressErrorsFor());
    if (n === 4) return !hasErrors(cardErrorsFor());
    return true;
  }

  /** Validates the current step, showing its errors and focusing the first invalid field. */
  function validateStep(n: number): boolean {
    if (n === 1) {
      if (scheduledFor && !slots.some((s) => s.toISOString() === scheduledFor)) {
        setScheduleError("That time is no longer available. Pick another slot or choose ASAP.");
        setFocusRequest({ id: "checkout-schedule" });
        return false;
      }
      setScheduleError(undefined);
      return true;
    }
    if (n === 2) {
      const errors = customerErrorsFor();
      setCustomerErrors(errors);
      const invalid = firstInvalidId(errors, CUSTOMER_FIELD_IDS);
      if (invalid) setFocusRequest({ id: invalid });
      return !invalid;
    }
    if (n === 3) {
      const errors = addressErrorsFor();
      setAddressErrors(errors);
      if (!hasErrors(errors)) return true;
      setFocusRequest({
        id: cart.fulfillment === "pickup" ? "checkout-pickup-first" : firstInvalidId(errors, ADDRESS_FIELD_IDS)!,
      });
      return false;
    }
    if (n === 4) {
      const errors = cardErrorsFor();
      setCardErrors(errors);
      const invalid = firstInvalidId(errors, CARD_FIELD_IDS);
      if (invalid) setFocusRequest({ id: invalid });
      return !invalid;
    }
    return true;
  }

  function goToStep(n: number) {
    setStep(n);
    if (n === 5) {
      setEditingFromReview(false);
      // Fresh review: show the cart's total and mint the Idempotency-Key for this order.
      setPlacedTotal(null);
      setPlaceError(null);
      idempotency.current = { key: newIdempotencyKey(), body: "" };
    }
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? "auto" : "smooth" });
  }

  function goNext() {
    if (!validateStep(step)) return;
    if (editingFromReview) {
      // Return straight to Review unless the edit made a later step incomplete
      // (e.g. switching to pickup with no location chosen yet).
      for (let n = step + 1; n < 5; n++) {
        if (!stepIsValid(n)) return goToStep(n);
      }
      return goToStep(5);
    }
    goToStep(Math.min(step + 1, 5));
  }

  function editFromReview(n: number) {
    setEditingFromReview(true);
    goToStep(n);
  }

  function goBack() {
    goToStep(Math.max(step - 1, 1));
  }

  async function placeOrder() {
    if (placing || placingRef.current || cart.items.length === 0) return;
    placingRef.current = true;
    setPlacing(true);
    setPlaceError(null);
    // The server re-prices the order; we send the total the customer is looking at
    // and it refuses (409 + fresh quote) if its total differs.
    // The tip is computed with the same computeTip the server uses, so the shown total matches.
    const shownTotalCents =
      placedTotal !== null ? Math.round(placedTotal * 100) : Math.round(cart.totals.total * 100) + tipCents;
    const body: CreateOrderRequest = {
      ...buildQuoteRequest(cart.items, cart.fulfillment, cart.pickupLocationId, cart.promoValid ? cart.promoCode : ""),
      ...(cart.fulfillment === "delivery" && tipChoice.kind !== "none" ? { tip: tipChoice } : {}),
      ...(scheduledFor ? { scheduledFor } : {}),
      paymentMethod: payment,
      // Contact details and the street address stay in this page; the server
      // only receives the city and ZIP for the tracker.
      ...(cart.fulfillment === "delivery" ? { deliveryArea: { city: address.city.trim(), zip: address.zip.trim() } } : {}),
      expectedTotalCents: shownTotalCents,
    };
    // One key per distinct order body, created on the Review step: a retry of the
    // same order (double click, flaky network) can never create a second one.
    const bodyJson = JSON.stringify(body);
    if (!idempotency.current || (idempotency.current.body && idempotency.current.body !== bodyJson)) {
      idempotency.current = { key: newIdempotencyKey(), body: bodyJson };
    }
    idempotency.current.body = bodyJson;
    try {
      const created = await placeOrderRequest(body, idempotency.current.key);
      saveOrderRef({ ...created, placedAt: new Date().toISOString() });
      // Keep the button's total steady while clearCart() zeroes the cart below.
      setPlacedTotal(shownTotalCents / 100);
      // Card fields only ever live in this component's state and are never saved
      // or sent; drop them now rather than keeping them around while we navigate away.
      setCard(EMPTY_CARD);
      // placingRef stays true from here, so the draft-saving effect can't write it back.
      clearCheckoutDraft();
      cart.clearCart();
      router.push(orderHref(created));
    } catch (err) {
      placingRef.current = false;
      setPlacing(false);
      if (err instanceof ApiError && err.code === "total_mismatch" && err.body?.quote) {
        setPlacedTotal(err.body.quote.totalCents / 100);
        setPlaceError(
          `Your total changed to ${formatPrice(err.body.quote.totalCents / 100)}. Check your order and place it again.`
        );
      } else {
        setPlaceError(err instanceof ApiError ? err.message : "We couldn't place your order. Please try again.");
      }
    }
  }

  if (!cart.hydrated) {
    return <PageLoading label="Loading your cart…" />;
  }
  if (cart.items.length === 0 && !placing) {
    // The effect above is redirecting to /menu.
    return <PageLoading label="Your cart is empty. Taking you to the menu…" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">Checkout</h1>
      <DemoNotice className="mt-4 max-w-2xl" />

      <div className="mt-8">
        <StepIndicator current={step} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-cream/10 bg-charcoal-soft p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={step}
              ref={stepPanelRef}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && (
                <FulfillmentStep
                  value={cart.fulfillment}
                  onChange={cart.setFulfillment}
                  slots={slots}
                  hoursLabel={`${scheduleLocation.name}, ${scheduleLocation.hours}`}
                  scheduledFor={scheduledFor}
                  onScheduleChange={(iso) => {
                    setScheduledFor(iso);
                    setScheduleError(undefined);
                  }}
                  scheduleError={scheduleError}
                />
              )}
              {step === 2 && (
                <CustomerStep value={customer} errors={customerErrors} onChange={setCustomer} />
              )}
              {step === 3 && (
                <AddressStep
                  fulfillment={cart.fulfillment}
                  address={address}
                  errors={addressErrors}
                  onAddressChange={setAddress}
                  pickupLocationId={cart.pickupLocationId}
                  onPickupLocationChange={(id) => {
                    cart.setPickupLocation(id);
                    setAddressErrors({});
                  }}
                />
              )}
              {step === 4 && (
                <PaymentStep fulfillment={cart.fulfillment} method={payment} onMethodChange={setPayment} card={card} onCardChange={setCard} errors={cardErrors} />
              )}
              {step === 5 && (
                <ReviewStep
                  fulfillment={cart.fulfillment}
                  customer={customer}
                  address={address}
                  pickupLocationId={cart.pickupLocationId}
                  payment={payment}
                  items={cart.items}
                  onEditStep={editFromReview}
                  onEditItems={cart.openCart}
                  scheduledFor={scheduledFor}
                  tip={tipChoice}
                  onTipChange={(t) => {
                    setTipChoice(t);
                    // A total confirmed after a 409 no longer applies once the tip changes.
                    setPlacedTotal(null);
                  }}
                  subtotalCents={Math.round(cart.totals.subtotal * 100)}
                />
              )}
            </m.div>
          </AnimatePresence>

          {step === 5 && (
            // On phones the sidebar summary sits below this card, i.e. after
            // Place Order — show the totals here instead, right above the button.
            <div className="mt-6 lg:hidden">
              <OrderSummary items={cart.items} totals={cart.totals} showItems={false} tip={tip} />
            </div>
          )}

          {step === 5 && placeError && (
            <p role="alert" className="mt-6 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-cream">
              {placeError}
            </p>
          )}

          <div
            className={
              step === 5
                ? "mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
                : "mt-8 flex items-center justify-between gap-3"
            }
          >
            <Button
              variant="outline"
              size="md"
              onClick={goBack}
              disabled={step === 1}
              icon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            {step < 5 ? (
              <Button
                variant="primary"
                size="md"
                onClick={goNext}
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                {editingFromReview ? "Save & Review" : "Continue"}
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={placeOrder} disabled={placing} className="w-full sm:w-auto">
                Place Order · {formatPrice(placedTotal ?? cart.totals.total + tip)}
              </Button>
            )}
          </div>
        </div>

        <div className={step === 5 ? "hidden lg:order-2 lg:block" : "lg:order-2"}>
          <OrderSummary items={cart.items} totals={cart.totals} tip={tip} />
        </div>
      </div>
    </div>
  );
}
