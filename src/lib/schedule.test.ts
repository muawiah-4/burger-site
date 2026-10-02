import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { formatSlot, generateTimeSlots, isAvailableSlot, parseHours } from "@/lib/schedule";

// All four kitchens are in San Francisco. 15 June 2026 is in PDT (UTC-7), so these
// instants are LA wall-clock times whatever zone the test process runs in.
const LA = "America/Los_Angeles";
const at = (h: number, m = 0) =>
  new Date(`2026-06-15T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-07:00`);
const laClock = new Intl.DateTimeFormat("en-US", { timeZone: LA, hour: "numeric", minute: "2-digit", hourCycle: "h23" });
const hm = (d: Date) => laClock.format(d).replace(/^0(?=\d:)/, "").replace(/^24:/, "0:");

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
    const slots = generateTimeSlots(at(12, 7), hours, LA);
    expect(hm(slots[0])).toBe("12:45"); // 12:37 rounded up
    expect(hm(slots[1])).toBe("13:00");
  });

  it("an exact boundary keeps that slot", () => {
    expect(hm(generateTimeSlots(at(12, 0), hours, LA)[0])).toBe("12:30");
  });

  it("starts at opening time before the location opens", () => {
    const slots = generateTimeSlots(at(7, 0), hours, LA);
    expect(hm(slots[0])).toBe("10:00");
  });

  it("ends one step before closing and spaces slots 15 minutes apart", () => {
    const slots = generateTimeSlots(at(20, 0), hours, LA);
    expect(hm(slots[slots.length - 1])).toBe("21:45");
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].getTime() - slots[i - 1].getTime()).toBe(15 * 60_000);
    }
  });

  it("returns no slots once it's too late today", () => {
    expect(generateTimeSlots(at(21, 30), hours, LA)).toEqual([]);
    expect(generateTimeSlots(at(23, 0), hours, LA)).toEqual([]);
  });

  it("runs past midnight for late-closing locations", () => {
    const slots = generateTimeSlots(at(23, 0), "10:00 AM – 12:00 AM", LA);
    expect(slots.map(hm)).toEqual(["23:30", "23:45"]);
  });

  it("returns nothing for unparseable hours", () => {
    expect(generateTimeSlots(at(12), "Closed", LA)).toEqual([]);
  });
});

describe("isAvailableSlot / formatSlot", () => {
  it("matches only generated slots", () => {
    const now = at(12, 0);
    const [first] = generateTimeSlots(now, "10:00 AM – 10:00 PM", LA);
    expect(isAvailableSlot(first.toISOString(), now, "10:00 AM – 10:00 PM", LA)).toBe(true);
    expect(isAvailableSlot(at(12, 10).toISOString(), now, "10:00 AM – 10:00 PM", LA)).toBe(false);
    expect(isAvailableSlot("not a date", now, "10:00 AM – 10:00 PM", LA)).toBe(false);
  });

  it("formats as a short 12-hour time", () => {
    expect(formatSlot(at(18, 45), LA)).toBe("6:45 PM");
  });
});

describe("time zones", () => {
  const originalTz = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "Asia/Karachi"; // UTC+5, twelve hours ahead of San Francisco in summer
  });
  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("uses the location's hours and day, not the process time zone", () => {
    // Sanity check that the process zone really changed.
    expect(new Date(Date.UTC(2026, 5, 15, 12)).getTimezoneOffset()).toBe(-300);
    // 9:00 PM in LA is already 9:00 AM tomorrow in Karachi.
    const now = at(21, 0);
    const slots = generateTimeSlots(now, "10:00 AM – 10:00 PM", LA);
    expect(slots.map(hm)).toEqual(["21:30", "21:45"]);
    expect(slots[0].toISOString()).toBe("2026-06-16T04:30:00.000Z");
    expect(formatSlot(slots[0], LA)).toBe("9:30 PM");
    expect(isAvailableSlot(slots[1].toISOString(), now, "10:00 AM – 10:00 PM", LA)).toBe(true);
    // Before opening in LA, the first slot is LA's opening time.
    expect(hm(generateTimeSlots(at(6, 0), "10:00 AM – 10:00 PM", LA)[0])).toBe("10:00");
  });

  it("keeps 15-minute spacing across a DST change after midnight", () => {
    // 1 Nov 2026: clocks go back at 2 AM in LA. 11:00 PM PDT on 31 Oct = 06:00 UTC.
    const now = new Date("2026-11-01T06:00:00Z");
    const slots = generateTimeSlots(now, "9:00 AM – 1:00 AM", LA);
    expect(slots.map(hm)).toEqual(["23:30", "23:45", "0:00", "0:15", "0:30", "0:45"]);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].getTime() - slots[i - 1].getTime()).toBe(15 * 60_000);
    }
  });
});
