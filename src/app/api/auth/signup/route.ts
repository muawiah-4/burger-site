import { errorResponse, handle, json, rateLimit, readJson } from "@/server/http";
import { signupSchema } from "@/server/schemas";
import {
  assertSameOrigin,
  createSession,
  deleteSessionByToken,
  insertUser,
  readSessionToken,
  toPublicUser,
  withSessionCookie,
} from "@/server/auth";
import { hashPassword, passwordProblem } from "@/server/passwords";

/** POST /api/auth/signup — creates an account and signs it in. */
export async function POST(request: Request) {
  return handle(request, async () => {
    assertSameOrigin(request);
    rateLimit(request, "signup", 10, 15 * 60_000);
    const input = await readJson(request, signupSchema);
    const problem = passwordProblem(input.password, input.email);
    if (problem) return errorResponse(400, "weak_password", problem);
    // Hash before checking for an existing account, so both paths take the same time.
    const passwordHash = await hashPassword(input.password);
    const user = insertUser({ email: input.email, passwordHash, name: input.name ?? "", phone: input.phone ?? "" });
    if (!user) {
      return errorResponse(
        409,
        "email_unavailable",
        "We couldn't create an account with that email. If you already have one, sign in instead."
      );
    }
    deleteSessionByToken(readSessionToken(request));
    const token = createSession(user.id, request);
    return withSessionCookie(json({ user: toPublicUser(user), address: null }, 201), token);
  });
}
