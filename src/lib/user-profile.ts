export const USER_STORAGE_KEY = "ember.user.v1";

export interface SavedUserProfile {
  name: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  zip: string;
}

const EMPTY_PROFILE: SavedUserProfile = { name: "", phone: "", email: "", line1: "", city: "", zip: "" };

const MAX_FIELD_LENGTH: Record<keyof SavedUserProfile, number> = {
  name: 100,
  phone: 30,
  email: 254,
  line1: 200,
  city: 100,
  zip: 10,
};

/** Tampered storage can hold anything: keep strings only, strip control characters and cap the length. */
function cleanField(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
}

/** Reads the profile saved from the Account modal. Safe on the server (returns an empty profile). */
export function getSavedUserProfile(): SavedUserProfile {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { ...EMPTY_PROFILE };
    const record = parsed as Partial<Record<keyof SavedUserProfile, unknown>>;
    const out = { ...EMPTY_PROFILE };
    for (const key of Object.keys(out) as (keyof SavedUserProfile)[]) {
      out[key] = cleanField(record[key], MAX_FIELD_LENGTH[key]);
    }
    return out;
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveUserProfile(profile: SavedUserProfile) {
  try {
    const clean = { ...EMPTY_PROFILE };
    for (const key of Object.keys(clean) as (keyof SavedUserProfile)[]) {
      clean[key] = cleanField(profile[key], MAX_FIELD_LENGTH[key]).trim();
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Ignore if localStorage unavailable
  }
}
