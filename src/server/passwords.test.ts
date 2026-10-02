import { describe, expect, it } from "vitest";
import { hashPassword, needsRehash, passwordProblem, SCRYPT_PARAMS, verifyPassword } from "./passwords";

describe("passwords", () => {
  it("hashes with scrypt and a per-hash random salt, and verifies", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).toMatch(new RegExp(`^scrypt\\$${SCRYPT_PARAMS.N}\\$8\\$1\\$[A-Za-z0-9_-]{22}\\$[A-Za-z0-9_-]{43}$`));
    expect(a).not.toBe(b);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
    expect(needsRehash(a)).toBe(false);
    expect(SCRYPT_PARAMS.N).toBeGreaterThanOrEqual(2 ** 15);
  });

  it("enforces length and blocks common passwords", () => {
    expect(passwordProblem("short")).toMatch(/at least 10/);
    expect(passwordProblem("Password123")).toMatch(/too common/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/too common/);
    expect(passwordProblem("me@example.com", "me@example.com")).toMatch(/email/);
    expect(passwordProblem("grilled onion stack")).toBeNull();
  });
});
