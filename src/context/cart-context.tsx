"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { CartItem, FulfillmentMethod } from "@/types";
import { computeTotals, evaluatePromo, MAX_ITEM_QUANTITY, selectionKey, Totals } from "@/lib/cart";
import { EMPTY_CART_STATE, parseStoredCart, StoredCartState } from "@/lib/cart-storage";
import { uid } from "@/lib/utils";

type CartState = StoredCartState;

type Action =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "cartItemId">; key: string }
  | { type: "REMOVE_ITEM"; cartItemId: string }
  | { type: "UPDATE_QUANTITY"; cartItemId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "SET_FULFILLMENT"; fulfillment: FulfillmentMethod }
  | { type: "SET_PICKUP_LOCATION"; locationId: string }
  | { type: "SET_PROMO"; code: string }
  | { type: "HYDRATE"; state: CartState };

const STORAGE_KEY = "ember.cart.v1";

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existingIndex = state.items.findIndex(
        (i) => selectionKey(i.productId, keyToSelection(i)) === action.key
      );
      if (existingIndex >= 0) {
        const items = [...state.items];
        items[existingIndex] = {
          ...items[existingIndex],
          quantity: Math.min(items[existingIndex].quantity + action.item.quantity, MAX_ITEM_QUANTITY),
        };
        return { ...state, items };
      }
      const newItem: CartItem = {
        ...action.item,
        quantity: Math.min(action.item.quantity, MAX_ITEM_QUANTITY),
        cartItemId: uid("cart"),
      };
      return { ...state, items: [...state.items, newItem] };
    }
    case "REMOVE_ITEM":
      return { ...state, items: state.items.filter((i) => i.cartItemId !== action.cartItemId) };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.cartItemId !== action.cartItemId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.cartItemId === action.cartItemId ? { ...i, quantity: Math.min(action.quantity, MAX_ITEM_QUANTITY) } : i
        ),
      };
    }
    case "CLEAR_CART":
      return { ...state, items: [], promoCode: "" };
    case "SET_FULFILLMENT":
      return { ...state, fulfillment: action.fulfillment };
    case "SET_PICKUP_LOCATION":
      return { ...state, pickupLocationId: action.locationId };
    case "SET_PROMO":
      return { ...state, promoCode: action.code };
    case "HYDRATE":
      return action.state;
    default:
      return state;
  }
}

// selectionKey only needs productId + option maps; reconstruct a comparable shape from a CartItem
function keyToSelection(item: CartItem) {
  const selection: Record<string, string[]> = {};
  for (const opt of item.selectedOptions) {
    selection[opt.groupId] = opt.choiceIds;
  }
  return selection;
}

const initialState: CartState = EMPTY_CART_STATE;

interface CartContextValue {
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  pickupLocationId: string | null;
  promoCode: string;
  promoMessage: string;
  promoValid: boolean;
  totals: Totals;
  itemCount: number;
  isOpen: boolean;
  hydrated: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setFulfillment: (f: FulfillmentMethod) => void;
  setPickupLocation: (locationId: string) => void;
  applyPromo: (code: string) => void;
  clearPromo: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // parseStoredCart validates the shape, drops malformed lines and re-prices
      // items from the menu data rather than trusting stored prices.
      if (raw) dispatch({ type: "HYDRATE", state: parseStoredCart(raw) });
    } catch {
      // storage unavailable — start with an empty cart
    } finally {
      setHydrated(true);
    }

    // Cross-tab sync: another tab wrote the cart, so adopt its state.
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage) return;
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      dispatch({ type: "HYDRATE", state: parseStoredCart(e.key === null ? null : e.newValue) });
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — ignore
    }
  }, [state, hydrated]);

  const subtotalOnly = useMemo(
    () => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    [state.items]
  );

  const promoResult = useMemo(
    () => evaluatePromo(state.promoCode, subtotalOnly),
    [state.promoCode, subtotalOnly]
  );
  const discount = promoResult.discount;

  const totals = useMemo(
    () => computeTotals(state.items, state.fulfillment, discount),
    [state.items, state.fulfillment, discount]
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items]
  );

  const addItem = useCallback((item: Omit<CartItem, "cartItemId">) => {
    const selection: Record<string, string[]> = {};
    for (const opt of item.selectedOptions) selection[opt.groupId] = opt.choiceIds;
    const key = selectionKey(item.productId, selection);
    dispatch({ type: "ADD_ITEM", item, key });
    setIsOpen(true);
  }, []);

  const applyPromo = useCallback((code: string) => {
    dispatch({ type: "SET_PROMO", code: code.trim().toUpperCase() });
  }, []);

  const value: CartContextValue = {
    items: state.items,
    fulfillment: state.fulfillment,
    pickupLocationId: state.pickupLocationId,
    promoCode: state.promoCode,
    promoMessage: promoResult.message,
    promoValid: promoResult.valid,
    totals,
    itemCount,
    isOpen,
    hydrated,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    addItem,
    removeItem: (cartItemId) => dispatch({ type: "REMOVE_ITEM", cartItemId }),
    updateQuantity: (cartItemId, quantity) => dispatch({ type: "UPDATE_QUANTITY", cartItemId, quantity }),
    clearCart: () => dispatch({ type: "CLEAR_CART" }),
    setFulfillment: (f) => dispatch({ type: "SET_FULFILLMENT", fulfillment: f }),
    setPickupLocation: (locationId) => dispatch({ type: "SET_PICKUP_LOCATION", locationId }),
    applyPromo,
    clearPromo: () => dispatch({ type: "SET_PROMO", code: "" }),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
