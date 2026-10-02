// Order-for-later time slots. Pure: callers pass "now" so this is testable.

export interface OpeningHours {
  /** Minutes after local midnight. */
  open: number;
  /** Minutes after local midnight; above 1440 when the location closes after midnight. */
  close: number;
}

export const SLOT_STEP_MINUTES = 15;
export const MIN_LEAD_MINUTES = 30;

function parseClock(text: string): number | null {
  const match = /^\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\s*$/i.exec(text);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const isPm = match[3].toUpperCase() === "PM";
  return ((hour % 12) + (isPm ? 12 : 0)) * 60 + minute;
}

/** Parses "10:00 AM – 12:00 AM" (en dash, hyphen or "to"). A close at or before open is the next day. */
export function parseHours(hours: string): OpeningHours | null {
  const parts = hours.split(/\s*(?:–|—|-|to)\s*/i);
  if (parts.length !== 2) return null;
  const open = parseClock(parts[0]);
  let close = parseClock(parts[1]);
  if (open === null || close === null) return null;
  if (close <= open) close += 24 * 60;
  return { open, close };
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  /** Minutes after midnight, including seconds as a fraction. */
  minutes: number;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    partsFormatters.set(timeZone, f);
  }
  return f;
}

/** The wall-clock date and time of `instant` in `timeZone`. */
function wallClock(instant: Date, timeZone: string): WallClock {
  const parts: Record<string, number> = {};
  for (const p of partsFormatter(timeZone).formatToParts(instant)) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  // Some engines report midnight as hour 24 even with h23.
  const hour = parts.hour % 24;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    minutes: hour * 60 + parts.minute + (parts.second + instant.getUTCMilliseconds() / 1000) / 60,
  };
}

/** Milliseconds `timeZone` is ahead of UTC at `instant`. */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const w = wallClock(new Date(instant), timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, 0, 0, 0, 0) + Math.round(w.minutes * 60_000);
  return asUtc - instant;
}

/** The instant of `minutes` after midnight on the given wall-clock day in `timeZone` (minutes may exceed 1440). */
function zonedInstant(year: number, month: number, day: number, minutes: number, timeZone: string): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minutes, 0, 0);
  let guess = naive - zoneOffsetMs(naive, timeZone);
  // A second pass settles the offset when a DST change lies between the two.
  guess = naive - zoneOffsetMs(guess, timeZone);
  return new Date(guess);
}

/**
 * Today's pickup/delivery slots: every `stepMinutes` within opening hours, starting
 * at least `leadMinutes` from `now`. The last slot is `stepMinutes` before closing.
 * "Today" and the hours are read in the location's `timeZone` (an IANA name), so the
 * result is the same whatever zone the browser or server runs in.
 */
export function generateTimeSlots(
  now: Date,
  hours: string,
  timeZone: string,
  { stepMinutes = SLOT_STEP_MINUTES, leadMinutes = MIN_LEAD_MINUTES } = {}
): Date[] {
  const parsed = parseHours(hours);
  if (!parsed || stepMinutes <= 0) return [];
  const today = wallClock(now, timeZone);
  const earliest = Math.max(parsed.open, today.minutes + leadMinutes);
  const first = Math.ceil(earliest / stepMinutes) * stepMinutes;
  const slots: Date[] = [];
  for (let t = first; t <= parsed.close - stepMinutes; t += stepMinutes) {
    slots.push(zonedInstant(today.year, today.month, today.day, t, timeZone));
  }
  return slots;
}

/** Is an ISO time still one of today's slots? Used to drop stale restored choices. */
export function isAvailableSlot(iso: string, now: Date, hours: string, timeZone: string): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return generateTimeSlots(now, hours, timeZone).some((s) => s.getTime() === time);
}

/** A slot as the location's local time, e.g. "6:45 PM". */
export function formatSlot(date: Date, timeZone: string): string {
  // Some ICU versions use a narrow no-break space before AM/PM; normalise it.
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone })
    .replace(/\u202f/g, " ");
}
