import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "@/server/db";
import { POST as quotePOST } from "@/app/api/quote/route";
import { POST as ordersPOST } from "./route";
import { GET as orderGET } from "./[id]/route";
import { PATCH as statusPATCH } from "./[id]/status/route";

const BODY = {
  fulfillment: "delivery",
  items: [
    { productId: "b-classic-smash", qty: 2, options: { patty: ["single"], cheese: ["cheddar"], sauce: ["signature"] } },
    { dealId: "deal-burger-fries-drink", qty: 1, options: { main: ["b-bbq-bacon"], side: ["side"], drink: ["dr-cola"] } },
  ],
  promoCode: "crave10",
  paymentMethod: "card",
  deliveryArea: { city: "San Francisco", zip: "94103" },
};

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function quoteTotal(): Promise<number> {
  const res = await quotePOST(post("/api/quote", { fulfillment: BODY.fulfillment, items: BODY.items, promoCode: BODY.promoCode }));
  expect(res.status).toBe(200);
  return (await res.json()).totalCents;
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  resetDbForTests(":memory:");
});

describe("POST /api/quote", () => {
  it("returns a server-priced breakdown with the promo outcome", async () => {
    const res = await quotePOST(post("/api/quote", { fulfillment: "delivery", items: BODY.items, promoCode: "CRAVE10" }));
    const q = await res.json();
    // 2 x 8.49 + 11.99 = 28.97; 10% = 2.90 (289.7 half-up); fee 3.49; tax on 26.07
    expect(q.subtotalCents).toBe(2897);
    expect(q.discountCents).toBe(290);
    expect(q.deliveryFeeCents).toBe(349);
    expect(q.taxCents).toBe(215);
    expect(q.totalCents).toBe(2897 - 290 + 349 + 215);
    expect(q.promo).toEqual({ code: "CRAVE10", applied: true, message: "10% off your order" });
  });

  it("rejects invalid input with a JSON 400", async () => {
    const res = await quotePOST(post("/api/quote", { fulfillment: "drone", items: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("returns 422 for options the menu doesn't allow", async () => {
    const res = await quotePOST(
      post("/api/quote", { fulfillment: "delivery", items: [{ productId: "b-classic-smash", qty: 1, options: {} }] })
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("missing_option");
  });
});

describe("POST /api/orders", () => {
  it("requires an Idempotency-Key", async () => {
    const res = await ordersPOST(post("/api/orders", { ...BODY, expectedTotalCents: 1 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_idempotency_key");
  });

  it("creates once and replays the same response for the same key and body", async () => {
    const body = { ...BODY, expectedTotalCents: await quoteTotal() };
    const key = "test-key-0000000000000001";
    const first = await ordersPOST(post("/api/orders", body, { "idempotency-key": key }));
    expect(first.status).toBe(201);
    const created = await first.json();
    expect(created).toMatchObject({ orderId: expect.any(String), displayNumber: expect.stringMatching(/^\d{5}$/) });

    const replay = await ordersPOST(post("/api/orders", body, { "idempotency-key": key }));
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotent-replayed")).toBe("true");
    expect(await replay.json()).toEqual(created);

    const reused = await ordersPOST(
      post("/api/orders", { ...body, paymentMethod: "cash" }, { "idempotency-key": key })
    );
    expect(reused.status).toBe(422);
    expect((await reused.json()).error.code).toBe("idempotency_key_reused");
  });

  it("returns 409 with a fresh quote when the expected total doesn't match", async () => {
    const total = await quoteTotal();
    const res = await ordersPOST(
      post("/api/orders", { ...BODY, expectedTotalCents: total - 100 }, { "idempotency-key": "test-key-0000000000000002" })
    );
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("total_mismatch");
    expect(body.quote.totalCents).toBe(total);

    // Nothing was stored, so the same key can be used once the total is corrected.
    const retry = await ordersPOST(
      post("/api/orders", { ...BODY, expectedTotalCents: total }, { "idempotency-key": "test-key-0000000000000002" })
    );
    expect(retry.status).toBe(201);
  });
});

describe("GET /api/orders/:id and the kitchen", () => {
  async function placeOrder() {
    const res = await ordersPOST(
      post("/api/orders", { ...BODY, expectedTotalCents: await quoteTotal() }, { "idempotency-key": "test-key-0000000000000003" })
    );
    return (await res.json()) as { orderId: string; trackingToken: string };
  }

  it("needs the matching tracking token", async () => {
    const { orderId, trackingToken } = await placeOrder();
    const ok = await orderGET(new Request(`http://localhost/api/orders/${orderId}?t=${trackingToken}`), params(orderId));
    expect(ok.status).toBe(200);
    const order = await ok.json();
    expect(order).toMatchObject({ id: orderId, status: "preparing", deliveryArea: { city: "San Francisco", zip: "94103" } });
    expect(order).not.toHaveProperty("trackingToken");

    const none = await orderGET(new Request(`http://localhost/api/orders/${orderId}`), params(orderId));
    expect(none.status).toBe(403);
    const wrong = await orderGET(
      new Request(`http://localhost/api/orders/${orderId}?t=${"A".repeat(43)}`),
      params(orderId)
    );
    expect(wrong.status).toBe(403);
  });

  it("advances status deterministically from elapsed time", async () => {
    const { orderId, trackingToken } = await placeOrder();
    const get = () => orderGET(new Request(`http://localhost/api/orders/${orderId}?t=${trackingToken}`), params(orderId));
    vi.useFakeTimers({ now: Date.now() + 23 * 60_000, toFake: ["Date"] }); // 65% of 35 min = 22.75
    try {
      const order = await (await get()).json();
      expect(order.status).toBe("on-the-way");
      expect(order.history.map((h: { status: string }) => h.status)).toEqual(["preparing", "cooking", "on-the-way"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("guards the admin status endpoint and allows next-stage moves only", async () => {
    const { orderId } = await placeOrder();
    const patch = (status: string, token?: string) =>
      statusPATCH(
        new Request(`http://localhost/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "content-type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
          body: JSON.stringify({ status }),
        }),
        params(orderId)
      );
    vi.stubEnv("ADMIN_TOKEN", "test-admin-token-123456");
    try {
      expect((await patch("cooking")).status).toBe(401);
      expect((await patch("cooking", "wrong-admin-token-12345")).status).toBe(401);
      expect((await patch("delivered", "test-admin-token-123456")).status).toBe(409);
      const ok = await patch("cooking", "test-admin-token-123456");
      expect(ok.status).toBe(200);
      expect((await ok.json()).status).toBe("cooking");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
