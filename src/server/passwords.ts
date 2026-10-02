import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt (no native addon).
 *
 * Stored format: `scrypt$<N>$<r>$<p>$<salt b64url>$<hash b64url>` so the cost can be
 * raised later; verify() reads the parameters from the stored string and
 * needsRehash() reports hashes made with older parameters.
 */
export const SCRYPT_PARAMS = { N: 2 ** 15, r: 8, p: 1, keyLen: 32, saltLen: 16 } as const;
// 128 * N * r = 32 MiB; give scrypt headroom above that.
const MAX_MEM = 96 * 1024 * 1024;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

function scrypt(password: string, salt: Buffer, keyLen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, keyLen, opts, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(password: string): Promise<string> {
  const { N, r, p, keyLen, saltLen } = SCRYPT_PARAMS;
  const salt = randomBytes(saltLen);
  const key = await scrypt(password, salt, keyLen, { N, r, p, maxmem: MAX_MEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > 2 ** 20) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length < 16 || expected.length < 16) return false;
  const key = await scrypt(password, salt, expected.length, { N, r, p, maxmem: MAX_MEM });
  return timingSafeEqual(key, expected);
}

export function needsRehash(stored: string): boolean {
  const [, N, r, p] = stored.split("$").map(Number);
  return N !== SCRYPT_PARAMS.N || r !== SCRYPT_PARAMS.r || p !== SCRYPT_PARAMS.p;
}

/**
 * A hash of a random password, verified against when the email is unknown so a
 * failed sign-in takes the same time whether or not the account exists.
 */
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(24).toString("base64url"));
  return dummyHash;
}

// A short embedded list of the most common passwords (all ≥ 10 chars, since shorter
// ones already fail the length rule). Compared case-insensitively.
const COMMON_PASSWORDS = new Set([
  "1234567890", "12345678910", "0123456789", "0987654321", "9876543210", "1111111111", "0000000000",
  "1234512345", "1q2w3e4r5t", "1qaz2wsx3edc", "qwertyuiop", "asdfghjkl;", "zxcvbnm123", "qwerty1234",
  "qwerty12345", "qwerty123456", "1qaz2wsx3e", "password12", "password123", "password1234", "password!1",
  "passw0rd123", "p@ssw0rd123", "p@ssword123", "iloveyou12", "iloveyou123", "princess12", "sunshine12",
  "football12", "football123", "baseball12", "baseball123", "basketball", "superman12", "batman1234",
  "letmein123", "welcome123", "welcome1234", "trustno1234", "monkey1234", "dragon1234", "master1234",
  "michael123", "starwars12", "computer12", "whatever12", "abcdefghij", "abcd123456", "abc1234567",
  "aaaaaaaaaa", "changeme12", "changeme123", "administrator", "admin12345", "admin123456", "qazwsxedc123",
  "1q2w3e4r5t6y", "zaq12wsxcde", "google1234", "123qweasdzxc", "pokemon123", "chocolate1", "liverpool1",
  "charlie123", "jennifer12", "123456789a", "a123456789", "12345qwert", "qwert12345", "passwordpassword",
  "burger1234", "ember12345", "emberburger",
]);

/** Returns a user-facing problem with the password, or null if it's acceptable. */
export function passwordProblem(password: string, email?: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower) || /^(.)\1+$/.test(password)) {
    return "That password is too common. Choose something harder to guess.";
  }
  if (email && lower === email.toLowerCase()) return "Don't use your email address as your password.";
  return null;
}
