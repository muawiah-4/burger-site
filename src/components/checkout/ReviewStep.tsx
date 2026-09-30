import { CreditCard, Banknote, Wallet, Pencil } from "lucide-react";
import { CartItem, CustomerInfo, DeliveryAddress, FulfillmentMethod, PaymentMethod } from "@/types";
import { formatPrice } from "@/lib/utils";
import { paymentLabel } from "@/lib/payment";
import { locations } from "@/lib/data/locations";

const PAYMENT_ICON: Record<PaymentMethod, typeof CreditCard> = {
  card: CreditCard,
  cash: Banknote,
  wallet: Wallet,
};

export function ReviewStep({
  fulfillment,
  customer,
  address,
  pickupLocationId,
  payment,
  items,
  onEditStep,
  onEditItems,
}: {
  fulfillment: FulfillmentMethod;
  customer: CustomerInfo;
  address: DeliveryAddress;
  pickupLocationId: string | null;
  payment: PaymentMethod;
  items: CartItem[];
  onEditStep: (step: number) => void;
  onEditItems: () => void;
}) {
  const PaymentIcon = PAYMENT_ICON[payment];
  const pickupLocation = locations.find((l) => l.id === pickupLocationId);

  return (
    <div>
      <h2 className="font-display text-xl font-extrabold text-cream">Review your order</h2>
      <p className="mt-1 text-sm text-cream/60">Double-check everything before you place it.</p>

      <div className="mt-6 flex flex-col gap-3">
        <ReviewRow title="Items" editLabel="Edit items in cart" onEdit={onEditItems}>
          <ul className="flex flex-col gap-1.5">
            {items.map((item) => (
              <li key={item.cartItemId} className="text-sm">
                <div className="flex justify-between gap-3 text-cream/70">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-cream">{formatPrice(item.unitPrice * item.quantity)}</span>
                </div>
                {item.selectedOptions.length > 0 && (
                  <p className="text-xs text-cream/60">
                    {item.selectedOptions.map((o) => o.choiceLabels.join(", ")).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </ReviewRow>

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
            <PaymentIcon size={15} /> {paymentLabel(payment, fulfillment)}
          </p>
        </ReviewRow>
      </div>
    </div>
  );
}

function ReviewRow({
  title,
  editLabel,
  onEdit,
  children,
}: {
  title: string;
  editLabel?: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-cream/10 bg-charcoal-raised p-4">
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xs font-bold uppercase tracking-wide text-cream/60">{title}</h3>
        <div className="mt-1">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel ?? `Edit ${title}`}
        className="focus-ring flex shrink-0 items-center gap-1 text-xs font-semibold text-ember-text hover:underline"
      >
        <Pencil size={12} /> Edit
      </button>
    </div>
  );
}
