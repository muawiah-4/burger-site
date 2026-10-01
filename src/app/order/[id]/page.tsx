"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin } from "lucide-react";
import { PlacedOrder } from "@/types";
import { getOrder, orderDisplayNumber } from "@/lib/orders";
import { formatPrice } from "@/lib/utils";
import { paymentLabel } from "@/lib/payment";
import { locations } from "@/lib/data/locations";
import { OrderProgress } from "@/components/checkout/OrderProgress";
import { ButtonLink } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/PageLoading";
import { DemoNotice } from "@/components/ui/DemoNotice";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<PlacedOrder | null | undefined>(undefined);

  useEffect(() => {
    // Orders live in localStorage, which is unavailable during SSR — this read
    // can only happen client-side after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrder(getOrder(params.id));
  }, [params.id]);

  if (order === undefined) {
    return <PageLoading label="Loading your order…" />;
  }

  if (order === null) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-4 px-5 pt-28 text-center">
        <h1 className="font-display text-2xl font-extrabold text-cream">Order not found</h1>
        <p className="text-sm text-cream/60">We couldn&apos;t find that order on this device.</p>
        <ButtonLink href="/menu">Back to Menu</ButtonLink>
      </div>
    );
  }

  const pickupLocation = order.pickupLocationId
    ? locations.find((l) => l.id === order.pickupLocationId)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-28 pt-28 sm:px-8 sm:pt-32">
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ember/10 text-ember-text">
          <CheckCircle2 size={32} />
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          ORDER CONFIRMED
        </h1>
        <p className="mt-2 text-sm text-cream/60">
          Order <span className="font-display font-bold text-cream">#{orderDisplayNumber(order)}</span>
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-semibold text-ember-text">
          <Clock size={14} /> Estimated {order.estimatedMinutes[0]}–{order.estimatedMinutes[1]} min
        </p>
        <DemoNotice className="mx-auto mt-5 max-w-md" />
      </div>

      <div className="mt-10 rounded-3xl border border-cream/10 bg-charcoal-soft p-6 sm:p-8">
        <OrderProgress order={order} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-cream/10 bg-charcoal-raised p-5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">
            {order.fulfillment === "delivery" ? "Delivering to" : "Pickup at"}
          </h2>
          {order.fulfillment === "delivery" ? (
            <p className="mt-2 flex items-start gap-2 text-sm text-cream/70">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>
                {order.deliveryArea ? `${order.deliveryArea.city}, ${order.deliveryArea.zip}` : "Your delivery address"}
                <br />
                <span className="text-xs text-cream/60">Street address isn&apos;t stored on this device.</span>
              </span>
            </p>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-sm text-cream/70">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>
                {pickupLocation?.name}
                <br />
                {pickupLocation?.address}
              </span>
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-cream/10 bg-charcoal-raised p-5">
          <h2 className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">
            {order.payment === "cash" ? "Total due (cash)" : "Total Paid"}
          </h2>
          <p className="mt-2 font-display text-2xl font-extrabold text-cream">{formatPrice(order.total)}</p>
          <p className="text-xs text-cream/60">
            {order.payment === "cash"
              ? order.fulfillment === "pickup"
                ? "Pay when you collect your order"
                : "Pay the driver when your order arrives"
              : `via ${paymentLabel(order.payment, order.fulfillment)}`}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-cream/10 bg-charcoal-raised p-5">
        <h2 className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">Order Items</h2>
        <ul className="mt-4 flex flex-col gap-4">
          {order.items.map((item) => (
            <li key={item.cartItemId} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-charcoal-soft">
                <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-cream">
                  {item.quantity}× {item.name}
                </p>
                {item.selectedOptions.length > 0 && (
                  <ul className="mt-0.5 text-xs leading-relaxed text-cream/60">
                    {item.selectedOptions.map((o) => (
                      <li key={o.groupId}>
                        <span className="font-semibold text-cream/70">{o.groupLabel}:</span>{" "}
                        {o.choiceLabels.join(", ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="font-display text-sm font-bold text-cream">
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <ButtonLink href="/menu" size="lg">
          Order Again
        </ButtonLink>
        <Link href="/" className="focus-ring text-xs font-semibold uppercase tracking-wide text-cream/60 hover:text-cream">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
