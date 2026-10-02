import { describe, expect, it } from "vitest";
import { formatSlot, generateTimeSlots, isAvailableSlot, parseHours } from "@/lib/schedule";

// Local-time dates, so the tests hold in any timezone.
const at = (h: number, m = 0) => new Date(2026, 5, 15, h, m, 0, 0);
const hm = (d: Date) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;

describe("parseHours", () => {
  it("parses same-day hours", () => {
    expect(parseHours("10:00 AM – 10:00 PM")).toEqual({ open: 600, close: 1320 });
  });

  it("treats a close at or before open as after midnight", () => {
    expect(parseHours("10:00 AM – 12:00 AM")).toEqual({ open: 600, close: 1440 });
    expect(parseHours("9:00 AM – 1:00 AM")).toEqual({ open: 540, close: 1500 });
  });

  it("accepts hyphens and hour-only times; rejects junk", () => {
    expect(parseHours("11 AM - 9:30 PM")).toEqual({ open: 660, close: 1290 });
    expect(parseHours("Open 24 hours")).toBeNull();
    expect(parseHours("13:00 PM – 2:00 AM")).toBeNull();
  });
});

describe("generateTimeSlots", () => {
  const hours = "10:00 AM – 10:00 PM";

  it("starts at least 30 minutes ahead, on a 15-minute boundary", () => {
    const slots = generateTimeSlots(at(12, 7), hours);
    expect(hm(slots[0])).toBe("12:45"); // 12:37 rounded up
    expect(hm(slots[1])).toBe("13:00");
  });

  it("an exact boundary keeps that slot", () => {
    expect(hm(generateTimeSlots(at(12, 0), hours)[0])).toBe("12:30");
  });

  it("starts at opening time before the location opens", () => {
    const slots = generateTimeSlots(at(7, 0), hours);
    expect(hm(slots[0])).toBe("10:00");
  });

  it("ends one step before closing and spaces slots 15 minutes apart", () => {
    const slots = generateTimeSlots(at(20, 0), hours);
    expect(hm(slots[slots.length - 1])).toBe("21:45");
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].getTime() - slots[i - 1].getTime()).toBe(15 * 60_000);
    }
  });

  it("returns no slots once it's too late today", () => {
    expect(generateTimeSlots(at(21, 30), hours)).toEqual([]);
    expect(generateTimeSlots(at(23, 0), hours)).toEqual([]);
  });

  it("runs past midnight for late-closing locations", () => {
    const slots = generateTimeSlots(at(23, 0), "10:00 AM – 12:00 AM");
    expect(slots.map(hm)).toEqual(["23:30", "23:45"]);
  });

  it("returns nothing for unparseable hours", () => {
    expect(generateTimeSlots(at(12), "Closed")).toEqual([]);
  });
});

describe("isAvailableSlot / formatSlot", () => {
  it("matches only generated slots", () => {
    const now = at(12, 0);
    const [first] = generateTimeSlots(now, "10:00 AM – 10:00 PM");
    expect(isAvailableSlot(first.toISOString(), now, "10:00 AM – 10:00 PM")).toBe(true);
    expect(isAvailableSlot(at(12, 10).toISOString(), now, "10:00 AM – 10:00 PM")).toBe(false);
    expect(isAvailableSlot("not a date", now, "10:00 AM – 10:00 PM")).toBe(false);
  });

  it("formats as a short 12-hour time", () => {
    expect(formatSlot(at(18, 45))).toBe("6:45 PM");
  });
});
