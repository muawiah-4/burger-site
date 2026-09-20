"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Product } from "@/types";

interface ProductModalContextValue {
  product: Product | null;
  open: (product: Product) => void;
  close: () => void;
}

const ProductModalContext = createContext<ProductModalContextValue | null>(null);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);

  const open = useCallback((p: Product) => setProduct(p), []);
  const close = useCallback(() => setProduct(null), []);

  const value = useMemo(() => ({ product, open, close }), [product, open, close]);

  return <ProductModalContext.Provider value={value}>{children}</ProductModalContext.Provider>;
}

export function useProductModal(): ProductModalContextValue {
  const ctx = useContext(ProductModalContext);
  if (!ctx) throw new Error("useProductModal must be used within ProductModalProvider");
  return ctx;
}
