import { verifyPassword } from "@/lib/auth/password.ts";
import { findUser } from "@/lib/auth/userRepo.ts";
import { ABSOLUTE_TTL_SECONDS, createSession } from "@/lib/auth/sessionRepo.ts";
import {
  checkAndIncrementIp,
  checkAndIncrementUser,
  resetUserFailures,
} from "@/lib/auth/rateLimitRepo.ts";
import { generateCsrfToken } from "@/lib/auth/csrf.ts";
import { COOKIE_NAME, signSessionId } from "@/lib/auth/sessionCookie.ts";

// Fixed dummy hash used for constant-time response when user is unknown.
// Generated once at module load so it's available without async.
let _dummyHash: string | null = null;

async function getDummyHash(): Promise<string> {
  if (_dummyHash) return _dummyHash;
  const { hashPassword } = await import("@/lib/auth/password.ts");
  _dummyHash = await hashPassword("dummy-constant-time-comparison-value");
  return _dummyHash;
}

export interface LoginRequest {
  username: string;
  password: string;
  ip: string;
}

export interface LoginResult {
  success: boolean;
  limited?: boolean;
  retryAfterSeconds?: number;
  cookie?: string;
  sessionId?: string;
  csrfToken?: string;
  userExists?: never; // explicitly absent — never expose this
}

export async function handleLoginPost(
  req: LoginRequest,
  sessionKey: string,
): Promise<LoginResult> {
  const { username, password, ip } = req;

  // Check IP rate limit first (cheapest check)
  const ipCheck = await checkAndIncrementIp(ip, sessionKey);
  if (ipCheck.limited) {
    return {
      success: false,
      limited: true,
      retryAfterSeconds: ipCheck.retryAfterSeconds,
    };
  }

  // Check per-username rate limit
  const userCheck = await checkAndIncrementUser(username);
  if (userCheck.limited) {
    return {
      success: false,
      limited: true,
      retryAfterSeconds: userCheck.retryAfterSeconds,
    };
  }

  // Fetch user — but always perform a hash comparison for constant-time response
  const user = await findUser(username);
  const hashToVerify = user?.passwordHash ?? await getDummyHash();
  const passwordOk = await verifyPassword(hashToVerify, password);

  if (!user || !passwordOk) {
    return { success: false };
  }

  // Successful login
  await resetUserFailures(username);

  const csrfToken = generateCsrfToken();
  const session = await createSession(username, csrfToken);
  const cookieValue = await signSessionId(session.sessionId, sessionKey);

  const cookie = [
    `${COOKIE_NAME}=${cookieValue}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${ABSOLUTE_TTL_SECONDS}`,
  ].join("; ");

  return {
    success: true,
    cookie,
    sessionId: session.sessionId,
    csrfToken,
  };
}
