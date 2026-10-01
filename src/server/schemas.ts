import "server-only";
import { z } from "zod";

// Request schemas for the /api routes. Every size is capped; unknown keys are rejected.

const id = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/, "Invalid id");

const options = z
  .record(id, z.array(id).max(10))
  .refine((o) => Object.keys(o).length <= 10, "Too many option groups");

export const quoteItemSchema = z
  .strictObject({
    productId: id.optional(),
    dealId: id.optional(),
    qty: z.number().int().min(1).max(20),
    options: options.optional(),
  })
  .refine((i) => Boolean(i.productId) !== Boolean(i.dealId), "Provide exactly one of productId or dealId");

const promoCode = z
  .string()
  .max(40)
  .transform((s) => s.trim().toUpperCase())
  .refine((s) => s === "" || /^[A-Z0-9]{1,20}$/.test(s), "Invalid promo code");

export const quoteRequestSchema = z.strictObject({
  fulfillment: z.enum(["delivery", "pickup"]),
  locationId: id.nullish(),
  items: z
    .array(quoteItemSchema)
    .min(1, "Your cart is empty")
    .max(30, "Too many lines in one order")
    .refine((items) => items.reduce((n, i) => n + i.qty, 0) <= 100, "Too many items in one order"),
  promoCode: promoCode.optional(),
});

export const createOrderSchema = quoteRequestSchema
  .extend({
    paymentMethod: z.enum(["card", "cash", "wallet"]),
    deliveryArea: z
      .strictObject({
        city: z.string().trim().min(1).max(60),
        zip: z
          .string()
          .trim()
          .regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code")
          .transform((z) => z.slice(0, 5)),
      })
      .optional(),
    expectedTotalCents: z.number().int().min(0).max(10_000_000),
  })
  .refine((o) => o.fulfillment === "pickup" || o.deliveryArea !== undefined, {
    message: "Delivery orders need a city and ZIP",
    path: ["deliveryArea"],
  })
  .refine((o) => o.fulfillment === "delivery" || o.deliveryArea === undefined, {
    message: "Pickup orders don't take a delivery area",
    path: ["deliveryArea"],
  });

export const statusUpdateSchema = z.strictObject({
  status: z.enum(["preparing", "cooking", "on-the-way", "ready", "delivered"]),
});

export const ORDER_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const TRACKING_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
