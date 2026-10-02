import "server-only";
import type { SavedAddress } from "@/lib/api-types";
import { getDb, type Db } from "./db";
import {
  assertNotLocked,
  clearLoginFailures,
  recordLoginFailure,
  type UserRow,
} from "./auth";
import { HttpError } from "./http";
import { verifyPassword } from "./passwords";

export function getSavedAddress(userId: string, db: Db = getDb()): SavedAddress | null {
  const row = db
    .prepare("SELECT line1, line2, city, zip, instructions FROM saved_addresses WHERE user_id = ?")
    .get(userId) as SavedAddress | undefined;
  return row ? { ...row } : null;
}

/**
 * Re-authenticates a signed-in user for a sensitive action (password change,
 * account deletion). Shares the sign-in lockout so it can't be used to guess.
 */
export async function assertCurrentPassword(request: Request, user: UserRow, password: string, db: Db = getDb()) {
  assertNotLocked(request, user.email, db);
  if (!(await verifyPassword(password, user.password_hash))) {
    recordLoginFailure(request, user.email, db);
    throw new HttpError(403, "wrong_password", "Your current password is incorrect.");
  }
  clearLoginFailures(request, user.email, db);
}
