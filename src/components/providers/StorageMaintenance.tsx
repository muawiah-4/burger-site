"use client";

import { useEffect } from "react";
import { getAllOrders } from "@/lib/orders";

/**
 * Applies order retention (20 newest, 30 days) and scrubs PII from orders saved by
 * older versions on every page load, not only when the order pages are opened.
 */
export function StorageMaintenance() {
  useEffect(() => {
    getAllOrders();
  }, []);
  return null;
}
