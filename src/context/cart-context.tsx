"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { CartItem, FulfillmentMethod } from "@/types";
import { computeTotals, MAX_ITEM_QUANTITY, PromoResult, selectionKey, Totals, totalsFromQuote } from "@/lib/cart";
import type { Quote } from "@/lib/api-types";
import { ApiError, buildQuoteRequest, fetchQuote } from "@/lib/order-client";
import { CART_STORAGE_KEY, EMPTY_CART_STATE, StoredCartState } from "@/lib/storage-shared";
import { uid } from "@/lib/utils";

type CartState = StoredCartState;

type Action =
  | { type: "ADD_ITEM"; item: Omit<CartItem, "cartItemId">; key: string }
  | { type: "REMOVE_ITEM"; cartItemId: string }
  | { type: "UPDATE_QUANTITY"; cartItemId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "RESET" }
  | { type: "SET_FULFILLMENT"; fulfillment: FulfillmentMethod }
  | { type: "SET_PICKUP_LOCATION"; locationId: string }
  | { type: "SET_PROMO"; code: string }
  | { type: "HYDRATE"; state: CartState; keepPending?: boolean };

const STORAGE_KEY = CART_STORAGE_KEY;

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
    case "RESET":
      return EMPTY_CART_STATE;
    case "SET_FULFILLMENT":
      return { ...state, fulfillment: action.fulfillment };
    case "SET_PICKUP_LOCATION":
      return { ...state, pickupLocationId: action.locationId };
    case "SET_PROMO":
      return { ...state, promoCode: action.code };
    case "HYDRATE":
      // The first read from storage lands after a chunk load; keep any line added
      // in the meantime instead of overwriting it.
      return action.keepPending && state.items.length > 0
        ? { ...action.state, items: [...action.state.items, ...state.items] }
        : action.state;
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

function readStoredCart(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage unavailable — start with an empty cart
  }
}

function loadParser() {
  return import("@/lib/cart-storage").then((m) => m.parseStoredCart);
}

function isEmptyCart(state: CartState) {
  return (
    state.items.length === 0 &&
    state.promoCode === EMPTY_CART_STATE.promoCode &&
    state.fulfillment === EMPTY_CART_STATE.fulfillment &&
    state.pickupLocationId === EMPTY_CART_STATE.pickupLocationId
  );
}

export interface CartStateValue {
  items: CartItem[];
  fulfillment: FulfillmentMethod;
  pickupLocationId: string | null;
  promoCode: string;
  promoMessage: string;
  promoValid: boolean;
  totals: Totals;
  itemCount: number;
  hydrated: boolean;
}

/** Stable for the provider's lifetime: consumers of these never re-render on cart changes. */
export interface CartActions {
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  /** Empties the cart and forgets fulfillment, pickup location and promo (used by "Clear my data"). */
  resetCart: () => void;
  setFulfillment: (f: FulfillmentMethod) => void;
  setPickupLocation: (locationId: string) => void;
  applyPromo: (code: string) => void;
  clearPromo: () => void;
}

type CartContextValue = CartStateValue & CartActions & { isOpen: boolean };

// Three contexts so a consumer only re-renders for what it reads: the cart
// contents, whether the drawer is open, or (never) the action functions.
const CartStateContext = createContext<CartStateValue | null>(null);
const CartOpenContext = createContext<boolean | null>(null);
const CartActionsContext = createContext<CartActions | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredCart();
    // parseStoredCart validates the shape, drops malformed lines and re-prices
    // items from the menu data rather than trusting stored prices. It needs the
    // whole catalogue, so it's loaded on demand instead of shipping on every route.
    const hydrate = stored
      ? loadParser().then((parse) => {
          if (!cancelled) dispatch({ type: "HYDRATE", state: parse(stored), keepPending: true });
        })
      : Promise.resolve();
    hydrate
      .catch(() => {
        // chunk failed to load — keep the empty cart
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    // Cross-tab sync: another tab wrote the cart, so adopt its state.
    function onStorage(e: StorageEvent) {
      if (e.storageArea !== localStorage) return;
      if (e.key !== STORAGE_KEY && e.key !== null) return;
      const value = e.key === null ? null : e.newValue;
      loadParser().then(
        (parse) => {
          if (!cancelled) dispatch({ type: "HYDRATE", state: parse(value) });
        },
        () => {}
      );
    }
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      // Nothing worth keeping: remove the key rather than persisting an empty cart,
      // so "Clear my data" really leaves no cart entry behind.
      if (isEmptyCart(state)) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage unavailable — ignore
    }
  }, [state, hydrated]);

  // Promo codes are checked by the server: with a code entered, the cart asks
  // /api/quote (debounced) and shows the server's discount and totals.
  const quoteRequest = useMemo(
    () =>
      state.promoCode && state.items.length > 0
        ? buildQuoteRequest(state.items, state.fulfillment, state.pickupLocationId, state.promoCode)
        : null,
    [state.items, state.fulfillment, state.pickupLocationId, state.promoCode]
  );
  const quoteKey = quoteRequest ? JSON.stringify(quoteRequest) : "";
  const [serverQuote, setServerQuote] = useState<{ key: string; code: string; result: PromoResult; quote: Quote | null } | null>(
    null
  );

  useEffect(() => {
    if (!quoteRequest) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetchQuote(quoteRequest, controller.signal).then(
        (quote) =>
          setServerQuote({
            key: quoteKey,
            code: quoteRequest.promoCode ?? "",
            quote,
            result: {
              valid: Boolean(quote.promo?.applied),
              message: quote.promo?.message ?? "",
              discount: quote.discountCents / 100,
            },
          }),
        (err: unknown) => {
          if (controller.signal.aborted) return;
          const message =
            err instanceof ApiError && err.status === 422 ? err.message : "We couldn't check that code right now.";
          setServerQuote({
            key: quoteKey,
            code: quoteRequest.promoCode ?? "",
            quote: null,
            result: { valid: false, message, discount: 0 },
          });
        }
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [quoteRequest, quoteKey]);

  const promoResult = useMemo<PromoResult>(() => {
    if (!state.promoCode) return { valid: false, message: "", discount: 0 };
    // While a re-quote is in flight keep the last answer for this code, so the
    // discount doesn't flicker when quantities change.
    if (serverQuote && serverQuote.code === state.promoCode) return serverQuote.result;
    return { valid: false, message: "Checking code…", discount: 0 };
  }, [state.promoCode, serverQuote]);

  const totals = useMemo(
    () =>
      serverQuote?.quote && serverQuote.key === quoteKey
        ? totalsFromQuote(serverQuote.quote)
        : computeTotals(state.items, state.fulfillment, promoResult.discount),
    [serverQuote, quoteKey, state.items, state.fulfillment, promoResult.discount]
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items]
  );

  const actions = useMemo<CartActions>(
    () => ({
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: (item) => {
        const selection: Record<string, string[]> = {};
        for (const opt of item.selectedOptions) selection[opt.groupId] = opt.choiceIds;
        const key = selectionKey(item.productId, selection);
        dispatch({ type: "ADD_ITEM", item, key });
        setIsOpen(true);
      },
      removeItem: (cartItemId) => dispatch({ type: "REMOVE_ITEM", cartItemId }),
      updateQuantity: (cartItemId, quantity) => dispatch({ type: "UPDATE_QUANTITY", cartItemId, quantity }),
      clearCart: () => dispatch({ type: "CLEAR_CART" }),
      resetCart: () => dispatch({ type: "RESET" }),
      setFulfillment: (f) => dispatch({ type: "SET_FULFILLMENT", fulfillment: f }),
      setPickupLocation: (locationId) => dispatch({ type: "SET_PICKUP_LOCATION", locationId }),
      applyPromo: (code) => dispatch({ type: "SET_PROMO", code: code.trim().toUpperCase() }),
      clearPromo: () => dispatch({ type: "SET_PROMO", code: "" }),
    }),
    []
  );

  const cartState = useMemo<CartStateValue>(
    () => ({
      items: state.items,
      fulfillment: state.fulfillment,
      pickupLocationId: state.pickupLocationId,
      promoCode: state.promoCode,
      promoMessage: promoResult.message,
      promoValid: promoResult.valid,
      totals,
      itemCount,
      hydrated,
    }),
    [state, promoResult, totals, itemCount, hydrated]
  );

  return (
    <CartActionsContext.Provider value={actions}>
      <CartStateContext.Provider value={cartState}>
        <CartOpenContext.Provider value={isOpen}>{children}</CartOpenContext.Provider>
      </CartStateContext.Provider>
    </CartActionsContext.Provider>
  );
}

function useRequired<T>(ctx: React.Context<T | null>, hook: string): T {
  const value = useContext(ctx);
  if (value === null) throw new Error(`${hook} must be used within CartProvider`);
  return value;
}

/** Cart actions only. The object is stable, so this never causes a re-render. */
export function useCartActions(): CartActions {
  return useRequired(CartActionsContext, "useCartActions");
}

/** Cart contents, totals and promo state. Re-renders when the cart changes. */
export function useCartState(): CartStateValue {
  return useRequired(CartStateContext, "useCartState");
}

/** Whether the cart drawer is open. */
export function useCartOpen(): boolean {
  return useRequired(CartOpenContext, "useCartOpen");
}

/**
 * Compatibility wrapper returning everything. It re-renders on any cart or drawer
 * change; prefer the narrower hooks above in frequently rendered components.
 */
export function useCart(): CartContextValue {
  const actions = useCartActions();
  const state = useCartState();
  const isOpen = useCartOpen();
  return useMemo(() => ({ ...state, ...actions, isOpen }), [state, actions, isOpen]);
}
