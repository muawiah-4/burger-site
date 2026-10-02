export type CategoryId =
  | "burgers"
  | "pizza"
  | "chicken"
  | "wraps"
  | "sandwiches"
  | "sides"
  | "desserts"
  | "drinks";

export interface Category {
  id: CategoryId;
  name: string;
  image: string;
  description: string;
}

export type Allergen = "gluten" | "dairy" | "egg" | "soy" | "sesame" | "nuts";

export type Badge = "best-seller" | "new" | "spicy" | "veggie";

export interface OptionChoice {
  id: string;
  label: string;
  priceDelta: number;
  default?: boolean;
}

export interface OptionGroup {
  id: string;
  label: string;
  type: "single" | "multi";
  required?: boolean;
  max?: number;
  choices: OptionChoice[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: CategoryId;
  description: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  /** Major allergens present in the default build (illustrative data). */
  allergens: Allergen[];
  /** Approximate calories for the default build (illustrative data). */
  calories: number;
  ingredients: string[];
  optionGroups: OptionGroup[];
  badges?: Badge[];
  isPopular?: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
}

export interface SelectedOption {
  groupId: string;
  groupLabel: string;
  choiceIds: string[];
  choiceLabels: string[];
  priceDelta: number;
}

export interface CartItem {
  cartItemId: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  category: CategoryId;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  selectedOptions: SelectedOption[];
}

export interface Deal {
  id: string;
  slug: string;
  name: string;
  description: string;
  includes: string[];
  image: string;
  originalPrice: number;
  price: number;
  ctaLabel: string;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  hours: string;
  distanceMiles: number;
  deliveryAvailable: boolean;
  pickupEta: string;
  lat: number;
  lng: number;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  text: string;
  initials: string;
  item?: string;
}

export type FulfillmentMethod = "delivery" | "pickup";

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

export interface DeliveryAddress {
  line1: string;
  line2: string;
  city: string;
  zip: string;
  instructions: string;
}

export interface DeliveryArea {
  city: string;
  zip: string;
}

export type PaymentMethod = "card" | "cash" | "wallet";

/** "ready" is pickup-only (waiting at the counter); "delivered" also means "picked up" for pickup orders. */
export type OrderStatus = "preparing" | "cooking" | "on-the-way" | "ready" | "delivered";

export interface PlacedOrder {
  /** Unique storage/URL key (a UUID; older orders used a 5-digit number). */
  id: string;
  /** Short number shown to the customer. Absent on orders saved before it existed. */
  displayNumber?: string;
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  /**
   * Coarse delivery area shown on the tracker. Saved orders deliberately hold no
   * name, phone, email or street address (older orders that did are scrubbed on load).
   */
  deliveryArea?: DeliveryArea;
  pickupLocationId?: string;
  payment: PaymentMethod;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  promoCode?: string;
  placedAt: string;
  estimatedMinutes: [number, number];
  /** Driver tip in dollars (server orders; already included in total). */
  tip?: number;
  /** ISO time for an order placed for later (server orders). */
  scheduledFor?: string;
}
