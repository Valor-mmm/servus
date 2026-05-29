import { deleteSession, findSession } from "@/lib/auth/sessionRepo.ts";
import { verifyCsrfToken } from "@/lib/auth/csrf.ts";
import { COOKIE_NAME } from "@/lib/auth/sessionCookie.ts";

export interface LogoutRequest {
  sessionId: string;
  username: string;
  csrfToken: string;
}

export interface LogoutResult {
  success: boolean;
  forbidden?: boolean;
  clearCookie?: string;
}

export async function handleLogoutPost(
  req: LogoutRequest,
): Promise<LogoutResult> {
  const { sessionId, username, csrfToken } = req;

  const session = await findSession(sessionId);
  if (!session) {
    return { success: false, forbidden: true };
  }

  if (!verifyCsrfToken(session.csrfToken, csrfToken)) {
    return { success: false, forbidden: true };
  }

  await deleteSession(sessionId, username);

  const clearCookie = [
    `${COOKIE_NAME}=;`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=0",
  ].join("; ");

  return { success: true, clearCookie };
}
