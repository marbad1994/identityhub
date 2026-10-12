import { one, rows, type Queryable } from "./db";
import { randomToken, sha256 } from "./crypto";
import { secureCookies } from "./env";

export const SESSION_COOKIE = "ihub_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; displayName: string; avatarUrl: string | null };

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function cookie(value: string, maxAgeSeconds: number): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    ...(secureCookies() ? ["Secure"] : []),
  ].join("; ");
}

/** Start a session and return its Set-Cookie header value. */
export async function createSession(userId: string, client?: Queryable): Promise<string> {
  const token = randomToken("ihs_");
  await rows(
    `insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
    client,
  );
  return cookie(token, SESSION_DAYS * 86400);
}

export async function sessionUser(request: Request): Promise<SessionUser | null> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  const row = await one<{ id: string; display_name: string; avatar_url: string | null }>(
    `select u.id, u.display_name, u.avatar_url from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  return row ? { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url } : null;
}

/** End the request's session and return the Set-Cookie header that clears it. */
export async function destroySession(request: Request): Promise<string> {
  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (token) await rows(`delete from sessions where token_hash = $1`, [sha256(token)]);
  return cookie("", 0);
}
