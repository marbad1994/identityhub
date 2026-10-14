import { getRequest, getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { clientIp } from "./client-ip";
import { sessionTokenHash, sessionUser, type SessionUser } from "./session";
import type { Ctx } from "./password-auth";

/** The signed-in user for the current server-function request. */
export async function currentUser(): Promise<SessionUser | null> {
  return sessionUser(getRequest());
}

/** Who is asking: client IP (proxy-aware), user agent and session, for limits and audit. */
export function requestContext(request: Request = getRequest()): Ctx {
  return {
    ip: clientIp(getRequestIP(), request.headers.get("x-forwarded-for")),
    userAgent: request.headers.get("user-agent"),
    sessionTokenHash: sessionTokenHash(request),
  };
}

export function setCookies(cookies: string[]): void {
  if (cookies.length > 0) setResponseHeader("Set-Cookie", cookies);
}
