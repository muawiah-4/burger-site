"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/cart-context";
import { useProductModal } from "@/context/product-modal-context";
import { useAccountModal } from "@/context/account-modal-context";
import { useOpenedOnce } from "@/hooks/useOpenedOnce";

// Each overlay's code is split out and only fetched the first time it opens. The
// open/closed state lives in the contexts, so nothing is lost while a chunk loads.
const CartDrawer = dynamic(() => import("@/components/cart/CartDrawer").then((m) => m.CartDrawer), { ssr: false });
const ProductModal = dynamic(() => import("@/components/product/ProductModal").then((m) => m.ProductModal), {
  ssr: false,
});
const AccountModal = dynamic(() => import("@/components/account/AccountModal").then((m) => m.AccountModal), {
  ssr: false,
});
// Decorative and client-only: load it after hydration instead of in the shared bundle.
const Mascot = dynamic(() => import("@/components/layout/Mascot").then((m) => m.Mascot), { ssr: false });

export function LazyOverlays() {
  const pathname = usePathname();
  const cartOpened = useOpenedOnce(useCart().isOpen);
  const productOpened = useOpenedOnce(useProductModal().product !== null);
  const accountOpened = useOpenedOnce(useAccountModal().isOpen);

  return (
    <>
      {cartOpened && <CartDrawer />}
      {productOpened && <ProductModal />}
      {accountOpened && <AccountModal />}
      {/* Mascot hides itself on checkout; skip even loading it there. */}
      {!pathname.startsWith("/checkout") && <Mascot />}
    </>
  );
}
