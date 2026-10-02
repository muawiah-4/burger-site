import "server-only";
import { z } from "zod";
import { MAX_TIP_CENTS } from "@/lib/tip";

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
  tip: z
    .discriminatedUnion("kind", [
      z.strictObject({ kind: z.literal("none") }),
      z.strictObject({ kind: z.literal("percent"), percent: z.union([z.literal(10), z.literal(15), z.literal(20)]) }),
      z.strictObject({ kind: z.literal("custom"), cents: z.number().int().min(0).max(MAX_TIP_CENTS) }),
    ])
    .optional(),
  scheduledFor: z.iso.datetime({ offset: true }).nullish(),
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

// ---------------------------------------------------------------- accounts

const email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email("Enter a valid email address."))
  .transform((s) => s.toLowerCase());
// Length/commonness are checked in passwords.ts so the message can be specific.
const password = z.string().min(1).max(200);
const name = z.string().trim().max(100).regex(/^[^\u0000-\u001f\u007f<>]*$/, "Invalid characters");
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9+().\-\s]*$/, "Use digits, spaces and + ( ) - only");

export const signupSchema = z.strictObject({ email, password, name: name.optional(), phone: phone.optional() });
export const loginSchema = z.strictObject({ email, password });
export const profileUpdateSchema = z
  .strictObject({ name: name.optional(), phone: phone.optional() })
  .refine((o) => o.name !== undefined || o.phone !== undefined, "Nothing to update");
const addrText = (max: number) => z.string().trim().max(max).regex(/^[^\u0000-\u001f\u007f<>]*$/, "Invalid characters");
export const addressSchema = z.strictObject({
  line1: addrText(200).min(1, "Street address is required"),
  line2: addrText(100).optional().default(""),
  city: addrText(60).min(1, "City is required"),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Invalid ZIP code"),
  instructions: addrText(300).optional().default(""),
});
export const changePasswordSchema = z.strictObject({ currentPassword: password, newPassword: password });
export const deleteAccountSchema = z.strictObject({ password });
export const claimOrdersSchema = z
  .array(
    z.strictObject({
      orderId: z.string().regex(ORDER_ID_RE, "Invalid order id"),
      trackingToken: z.string().regex(TRACKING_TOKEN_RE, "Invalid tracking token"),
    })
  )
  .min(1)
  .max(50);
