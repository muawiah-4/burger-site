"use client";

import { CartItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { useCartActions } from "@/context/cart-context";
import { useFlyToCartActions } from "@/context/fly-to-cart-context";

/**
 * Client leaf for Server Components that only need an "add this line" button. The
 * cart line is built on the server and passed in, so no menu data ships for it.
 */
export function AddToCartButton({
  item,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  item: Omit<CartItem, "cartItemId">;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { addItem } = useCartActions();
  const { launch } = useFlyToCartActions();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={(e) => {
        // Fly from the card's image when the card marks one, else from the button.
        const card = e.currentTarget.closest("[data-fly-card]");
        launch(card?.querySelector<HTMLElement>("[data-fly-source]") ?? e.currentTarget, item.image);
        addItem(item);
      }}
    >
      {children}
    </Button>
  );
}
