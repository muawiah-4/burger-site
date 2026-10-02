import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests } from "@/server/db";
import { POST as quotePOST } from "@/app/api/quote/route";
import { POST as ordersPOST } from "./route";
import { GET as orderGET } from "./[id]/route";

const ITEMS = [
  { productId: "b-classic-smash", qty: 2, options: { patty: ["single"], cheese: ["cheddar"], sauce: ["signature"] } },
  { dealId: "deal-burger-fries-drink", qty: 1, options: { main: ["b-bbq-bacon"], side: ["side"], drink: ["dr-cola"] } },
];

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetDbForTests(":memory:");
});
afterEach(() => {
  vi.useRealTimers();
});

describe("tip and scheduled orders through the API", () => {
  it("charges the tip, stores the slot and holds the kitchen until its start time", async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 1, 12, 0), toFake: ["Date"] });
    const slot = new Date(2026, 9, 1, 14, 0).toISOString();
    const extra = { tip: { kind: "percent", percent: 20 }, scheduledFor: slot };

    const q = await (await quotePOST(post("/api/quote", { fulfillment: "delivery", items: ITEMS, ...extra }))).json();
    expect(q.tipCents).toBe(579); // 20% of 2897 = 579.4
    expect(q.scheduledFor).toBe(slot);

    const res = await ordersPOST(
      post(
        "/api/orders",
        {
          fulfillment: "delivery",
          items: ITEMS,
          ...extra,
          paymentMethod: "cash",
          deliveryArea: { city: "San Francisco", zip: "94103" },
          expectedTotalCents: q.totalCents,
        },
        { "idempotency-key": "test-key-sched-000000001" }
      )
    );
    expect(res.status).toBe(201);
    const { orderId, trackingToken } = await res.json();
    const get = async () =>
      (
        await orderGET(new Request(`http://localhost/api/orders/${orderId}?t=${trackingToken}`), {
          params: Promise.resolve({ id: orderId }),
        })
      ).json();

    // Kitchen starts one ETA (35 min) before the 14:00 slot, at 13:25.
    vi.setSystemTime(new Date(2026, 9, 1, 13, 20));
    expect(await get()).toMatchObject({ status: "preparing", tipCents: 579, scheduledFor: slot, totalCents: q.totalCents });
    vi.setSystemTime(new Date(2026, 9, 1, 13, 40));
    expect((await get()).status).toBe("cooking");
  });

  it("rejects a slot that isn't offered (422)", async () => {
    const res = await quotePOST(
      post("/api/quote", {
        fulfillment: "delivery",
        items: ITEMS,
        scheduledFor: new Date(Date.now() + 60_000).toISOString(),
      })
    );
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("invalid_schedule");
  });

  it("rejects a malformed tip (400)", async () => {
    const res = await quotePOST(
      post("/api/quote", { fulfillment: "delivery", items: ITEMS, tip: { kind: "percent", percent: 50 } })
    );
    expect(res.status).toBe(400);
  });
});
