import { CreditCard, Banknote, Wallet, Pencil } from "lucide-react";
import { CustomerInfo, DeliveryAddress, FulfillmentMethod, PaymentMethod } from "@/types";
import { locations } from "@/lib/data/locations";

const PAYMENT_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  wallet: Wallet,
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  card: "Card",
  cash: "Cash on Delivery",
  wallet: "Digital Wallet",
};

export function ReviewStep({
  fulfillment,
  customer,
  address,
  pickupLocationId,
  payment,
  onEditStep,
}: {
  fulfillment: FulfillmentMethod;
  customer: CustomerInfo;
  address: DeliveryAddress;
  pickupLocationId: string | null;
  payment: PaymentMethod;
  onEditStep: (step: number) => void;
}) {
  const PaymentIcon = PAYMENT_ICON[payment];
  const pickupLocation = locations.find((l) => l.id === pickupLocationId);

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Review your order</h2>
      <p className="mt-1 text-sm text-cream/60">Double-check everything before you place it.</p>

      <div className="mt-6 flex flex-col gap-3">
        <ReviewRow title="Fulfillment" onEdit={() => onEditStep(1)}>
          <p className="text-sm capitalize text-cream/70">{fulfillment}</p>
        </ReviewRow>

        <ReviewRow title="Contact" onEdit={() => onEditStep(2)}>
          <p className="text-sm text-cream/70">{customer.name}</p>
          <p className="text-sm text-cream/60">
            {customer.phone} · {customer.email}
          </p>
        </ReviewRow>

        <ReviewRow title={fulfillment === "delivery" ? "Delivery Address" : "Pickup Location"} onEdit={() => onEditStep(3)}>
          {fulfillment === "delivery" ? (
            <>
              <p className="text-sm text-cream/70">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ""}
              </p>
              <p className="text-sm text-cream/60">
                {address.city}, {address.zip}
              </p>
              {address.instructions && <p className="text-xs text-cream/60">{address.instructions}</p>}
            </>
          ) : (
            <>
              <p className="text-sm text-cream/70">{pickupLocation?.name}</p>
              <p className="text-sm text-cream/60">{pickupLocation?.address}</p>
            </>
          )}
        </ReviewRow>

        <ReviewRow title="Payment" onEdit={() => onEditStep(4)}>
          <p className="flex items-center gap-2 text-sm text-cream/70">
            <PaymentIcon size={15} /> {PAYMENT_LABEL[payment]}
          </p>
        </ReviewRow>
      </div>
    </div>
  );
}

function ReviewRow({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-cream/10 bg-charcoal-raised p-4">
      <div>
        <p className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${title}`}
        className="focus-ring flex shrink-0 items-center gap-1 text-xs font-semibold text-ember-text hover:underline"
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}
