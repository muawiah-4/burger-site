"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Product } from "@/types";

interface ProductModalContextValue {
  product: Product | null;
  open: (product: Product) => void;
  close: () => void;
}

interface ProductModalActions {
  open: (product: Product) => void;
  close: () => void;
}

// Split so product cards (which only call open) don't all re-render when the
// modal opens or closes.
const ProductModalActionsContext = createContext<ProductModalActions | null>(null);
const OpenProductContext = createContext<Product | null | undefined>(undefined);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);

  const open = useCallback((p: Product) => setProduct(p), []);
  const close = useCallback(() => setProduct(null), []);

  const actions = useMemo(() => ({ open, close }), [open, close]);

  return (
    <ProductModalActionsContext.Provider value={actions}>
      <OpenProductContext.Provider value={product}>{children}</OpenProductContext.Provider>
    </ProductModalActionsContext.Provider>
  );
}

/** open/close only. Stable: never causes a re-render. */
export function useProductModalActions(): ProductModalActions {
  const ctx = useContext(ProductModalActionsContext);
  if (!ctx) throw new Error("useProductModalActions must be used within ProductModalProvider");
  return ctx;
}

/** The product shown in the modal, or null when it's closed. */
export function useOpenProduct(): Product | null {
  const product = useContext(OpenProductContext);
  if (product === undefined) throw new Error("useOpenProduct must be used within ProductModalProvider");
  return product;
}

/** Compatibility wrapper returning the open product plus actions. */
export function useProductModal(): ProductModalContextValue {
  const actions = useProductModalActions();
  const product = useOpenProduct();
  return useMemo(() => ({ product, ...actions }), [product, actions]);
}
