"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CustomerInfo, DeliveryAddress, PaymentMethod, PlacedOrder } from "@/types";
import { generateDisplayNumber, generateOrderId, saveOrder } from "@/lib/orders";
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
  // Snapshot of the total at submit time: clearCart() zeroes cart.totals while we navigate away.
  const [placedTotal, setPlacedTotal] = useState<number | null>(null);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);

  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});
  // Set after a failed Continue; focused once the errors have rendered so AT reads them with the field.
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null);

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
    // Wait for the cart to finish reading localStorage before deciding it's
    // empty — otherwise a hard reload on this page bounces straight to /menu.
    if (cart.hydrated && !placing && cart.items.length === 0) {
      router.replace("/menu");
    }
  }, [cart.hydrated, cart.items.length, placing, router]);

  function validateCustomer(): boolean {
    const errors: Partial<Record<keyof CustomerInfo, string>> = {};
    if (!isValidName(customer.name)) errors.name = "Enter your full name.";
    if (!isValidPhone(customer.phone)) errors.phone = "Enter a valid phone number.";
    if (!isValidEmail(customer.email)) errors.email = "Enter a valid email address.";
    setCustomerErrors(errors);
    const invalid = firstInvalidId(errors, CUSTOMER_FIELD_IDS);
    if (invalid) setFocusRequest({ id: invalid });
    return !invalid;
  }

  function validateAddress(): boolean {
    if (cart.fulfillment === "pickup") {
      const ok = !!cart.pickupLocationId;
      setAddressErrors(ok ? {} : { line1: "Choose a pickup location to continue." });
      if (!ok) setFocusRequest({ id: "checkout-pickup-first" });
      return ok;
    }
    const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
    if (!address.line1.trim()) errors.line1 = "Street address is required.";
    if (!address.city.trim()) errors.city = "City is required.";
    if (!isValidZip(address.zip)) errors.zip = "Enter a valid ZIP code.";
    setAddressErrors(errors);
    const invalid = firstInvalidId(errors, ADDRESS_FIELD_IDS);
    if (invalid) setFocusRequest({ id: invalid });
    return !invalid;
  }

  function validatePayment(): boolean {
    if (payment !== "card") return true;
    const errors: Partial<Record<keyof CardDetails, string>> = {};
    if (!isValidName(card.name)) errors.name = "Enter the name on your card.";
    if (!isValidCardNumber(card.number)) errors.number = "Enter a valid card number.";
    if (!isValidExpiry(card.expiry)) errors.expiry = "Enter a valid, unexpired date (MM/YY).";
    if (!isValidCvc(card.cvc)) errors.cvc = "Enter a valid CVC.";
    setCardErrors(errors);
    const invalid = firstInvalidId(errors, CARD_FIELD_IDS);
    if (invalid) setFocusRequest({ id: invalid });
    return !invalid;
  }

  function goNext() {
    if (step === 2 && !validateCustomer()) return;
    if (step === 3 && !validateAddress()) return;
    if (step === 4 && !validatePayment()) return;
    setStep((s) => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function placeOrder() {
    if (placing || placingRef.current || cart.items.length === 0) return;
    placingRef.current = true;
    setPlacing(true);
    setPlacedTotal(cart.totals.total);
    const id = generateOrderId();
    const estimatedMinutes: [number, number] = cart.fulfillment === "delivery" ? [25, 35] : [12, 18];
    const order: PlacedOrder = {
      id,
      displayNumber: generateDisplayNumber(),
      items: cart.items,
      fulfillment: cart.fulfillment,
      customer,
      address: cart.fulfillment === "delivery" ? address : undefined,
      pickupLocationId: cart.fulfillment === "pickup" ? cart.pickupLocationId ?? undefined : undefined,
      payment,
      subtotal: cart.totals.subtotal,
      deliveryFee: cart.totals.deliveryFee,
      discount: cart.totals.discount,
      tax: cart.totals.tax,
      total: cart.totals.total,
      promoCode: cart.promoValid ? cart.promoCode : undefined,
      placedAt: new Date().toISOString(),
      estimatedMinutes,
    };
    saveOrder(order);
    cart.clearCart();
    router.push(`/order/${id}`);
  }

  if (cart.items.length === 0 && !placing) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">Checkout</h1>

      <div className="mt-8">
        <StepIndicator current={step} />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-cream/10 bg-charcoal-soft p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 1 && <FulfillmentStep value={cart.fulfillment} onChange={cart.setFulfillment} />}
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
                <PaymentStep method={payment} onMethodChange={setPayment} card={card} onCardChange={setCard} errors={cardErrors} />
              )}
              {step === 5 && (
                <ReviewStep
                  fulfillment={cart.fulfillment}
                  customer={customer}
                  address={address}
                  pickupLocationId={cart.pickupLocationId}
                  payment={payment}
                  onEditStep={setStep}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between gap-3">
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
                Continue
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={placeOrder} disabled={placing}>
                Place Order · {formatPrice(placedTotal ?? cart.totals.total)}
              </Button>
            )}
          </div>
        </div>

        <div className="lg:order-2">
          <OrderSummary items={cart.items} totals={cart.totals} />
        </div>
      </div>
    </div>
  );
}
