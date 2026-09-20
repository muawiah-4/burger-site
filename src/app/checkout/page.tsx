"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { CustomerInfo, DeliveryAddress, PaymentMethod, PlacedOrder } from "@/types";
import { generateOrderId, saveOrder } from "@/lib/orders";
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

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCart();
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [placing, setPlacing] = useState(false);

  const [customer, setCustomer] = useState<CustomerInfo>(EMPTY_CUSTOMER);
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);

  const [customerErrors, setCustomerErrors] = useState<Partial<Record<keyof CustomerInfo, string>>>({});
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardDetails, string>>>({});

  useEffect(() => {
    // Wait for the cart to finish reading localStorage before deciding it's
    // empty — otherwise a hard reload on this page bounces straight to /menu.
    if (cart.hydrated && !placing && cart.items.length === 0) {
      router.replace("/menu");
    }
  }, [cart.hydrated, cart.items.length, placing, router]);

  const canContinueFromAddress = useMemo(() => {
    if (cart.fulfillment === "pickup") return !!cart.pickupLocationId;
    return true;
  }, [cart.fulfillment, cart.pickupLocationId]);

  function validateCustomer(): boolean {
    const errors: Partial<Record<keyof CustomerInfo, string>> = {};
    if (!isValidName(customer.name)) errors.name = "Enter your full name.";
    if (!isValidPhone(customer.phone)) errors.phone = "Enter a valid phone number.";
    if (!isValidEmail(customer.email)) errors.email = "Enter a valid email address.";
    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateAddress(): boolean {
    if (cart.fulfillment === "pickup") {
      const ok = !!cart.pickupLocationId;
      setAddressErrors(ok ? {} : { line1: "Select a pickup location to continue." });
      return ok;
    }
    const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
    if (!address.line1.trim()) errors.line1 = "Street address is required.";
    if (!address.city.trim()) errors.city = "City is required.";
    if (!isValidZip(address.zip)) errors.zip = "Enter a valid ZIP code.";
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validatePayment(): boolean {
    if (payment !== "card") return true;
    const errors: Partial<Record<keyof CardDetails, string>> = {};
    if (!isValidName(card.name)) errors.name = "Enter the name on your card.";
    if (!isValidCardNumber(card.number)) errors.number = "Enter a valid card number.";
    if (!isValidExpiry(card.expiry)) errors.expiry = "Enter a valid, unexpired date (MM/YY).";
    if (!isValidCvc(card.cvc)) errors.cvc = "Enter a valid CVC.";
    setCardErrors(errors);
    return Object.keys(errors).length === 0;
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
    setPlacing(true);
    const id = generateOrderId();
    const estimatedMinutes: [number, number] = cart.fulfillment === "delivery" ? [25, 35] : [12, 18];
    const order: PlacedOrder = {
      id,
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
                  onPickupLocationChange={cart.setPickupLocation}
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
                disabled={step === 3 && !canContinueFromAddress}
                icon={<ArrowRight size={16} />}
                iconPosition="right"
              >
                Continue
              </Button>
            ) : (
              <Button variant="primary" size="lg" onClick={placeOrder}>
                Place Order · {cart.totals.total.toFixed(2) !== "0.00" ? `$${cart.totals.total.toFixed(2)}` : ""}
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
