import { LATEST_KEY, ORDERS_KEY } from "@/lib/orders";
import { USER_STORAGE_KEY } from "@/lib/user-profile";
import { CART_STORAGE_KEY } from "@/lib/cart-storage";

/** Every localStorage key Ember writes. Keep in sync with SECURITY.md. */
export const EMBER_STORAGE_KEYS = [CART_STORAGE_KEY, ORDERS_KEY, LATEST_KEY, USER_STORAGE_KEY] as const;

/** Removes the cart, order history and saved profile from this browser. Returns false if storage threw. */
export function clearAllLocalData(): boolean {
  try {
    for (const key of EMBER_STORAGE_KEYS) localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
