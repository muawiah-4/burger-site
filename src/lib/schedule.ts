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

/**
 * Today's pickup/delivery slots: every `stepMinutes` within opening hours, starting
 * at least `leadMinutes` from `now`. The last slot is `stepMinutes` before closing.
 */
export function generateTimeSlots(
  now: Date,
  hours: string,
  { stepMinutes = SLOT_STEP_MINUTES, leadMinutes = MIN_LEAD_MINUTES } = {}
): Date[] {
  const parsed = parseHours(hours);
  if (!parsed || stepMinutes <= 0) return [];
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const nowMinutes = (now.getTime() - midnight.getTime()) / 60_000;
  const earliest = Math.max(parsed.open, nowMinutes + leadMinutes);
  const first = Math.ceil(earliest / stepMinutes) * stepMinutes;
  const slots: Date[] = [];
  for (let t = first; t <= parsed.close - stepMinutes; t += stepMinutes) {
    const slot = new Date(midnight);
    slot.setMinutes(t);
    slots.push(slot);
  }
  return slots;
}

/** Is an ISO time still one of today's slots? Used to drop stale restored choices. */
export function isAvailableSlot(iso: string, now: Date, hours: string): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return generateTimeSlots(now, hours).some((s) => s.getTime() === time);
}

export function formatSlot(date: Date): string {
  // Some ICU versions use a narrow no-break space before AM/PM; normalise it.
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\u202f/g, " ");
}
