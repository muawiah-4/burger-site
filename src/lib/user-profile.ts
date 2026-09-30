const USER_STORAGE_KEY = "ember.user.v1";

export interface SavedUserProfile {
  name: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  zip: string;
}

const EMPTY_PROFILE: SavedUserProfile = { name: "", phone: "", email: "", line1: "", city: "", zip: "" };

/** Reads the profile saved from the Account modal. Safe on the server (returns an empty profile). */
export function getSavedUserProfile(): SavedUserProfile {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROFILE };
    const parsed = JSON.parse(raw) as Partial<Record<keyof SavedUserProfile, unknown>>;
    const out = { ...EMPTY_PROFILE };
    for (const key of Object.keys(out) as (keyof SavedUserProfile)[]) {
      if (typeof parsed?.[key] === "string") out[key] = parsed[key] as string;
    }
    return out;
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

export function saveUserProfile(profile: SavedUserProfile) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore if localStorage unavailable
  }
}
