import { one, rows, type Queryable } from "./db";
import { randomToken, sha256 } from "./crypto";
import { secureCookies } from "./env";
import { housekeeping } from "./housekeeping";

/** Absolute lifetime and idle timeout of a sign-in. */
const SESSION_DAYS = 30;
const IDLE_DAYS = 7;
/** Do not write last_seen_at on every request. */
const TOUCH_MINUTES = 10;

export type SessionUser = { id: string; displayName: string; avatarUrl: string | null };

/**
 * `__Host-` (Secure, Path=/, no Domain) on https, so no other subdomain can
 * set or overwrite the session cookie. Plain name on local http.
 */
export function sessionCookieName(): string {
  return secureCookies() ? "__Host-ihub_session" : "ihub_session";
}

/** Ordinary MFA challenge. Lax, including on http where None is rejected. */
export function challengeCookieName(): string {
  return secureCookies() ? "__Host-ihub_mfa" : "ihub_mfa";
}

/** MFA challenge set from a framed login. Partitioned only on https. */
export function embedChallengeCookieName(): string {
  return secureCookies() ? "__Host-ihub_mfa_embed" : "ihub_mfa_embed";
}

export function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export function serializeCookie(name: string, value: string, maxAgeSeconds: number): string {
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    ...(secureCookies() ? ["Secure"] : []),
  ].join("; ");
}

/**
 * https embed challenge: Partitioned so a Lax clear cannot drop it.
 * http keeps the Lax serializer; SameSite=None without Secure is rejected.
 */
export function serializeEmbedChallenge(value: string, maxAgeSeconds: number): string {
  const name = embedChallengeCookieName();
  if (!secureCookies()) return serializeCookie(name, value, maxAgeSeconds);
  return [
    `${name}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Partitioned",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

/** Canary pair for the https embed document. Not a session. Empty on http. */
export function embedProbeCookies(): string[] {
  if (!secureCookies()) return [];
  return [
    "ihub_part=1; Path=/; Secure; SameSite=None; Partitioned; Max-Age=900",
    "ihub_open=1; Path=/; Secure; SameSite=None; Max-Age=900",
  ];
}

/** Start a fresh session (never reuse a token across sign-ins) and return its Set-Cookie value. */
export async function createSession(
  userId: string,
  userAgent: string | null,
  client?: Queryable,
): Promise<string> {
  housekeeping();
  const token = randomToken("ihs_");
  await rows(
    `insert into sessions (token_hash, user_id, expires_at, user_agent) values ($1, $2, now() + make_interval(days => $3), $4)`,
    [sha256(token), userId, SESSION_DAYS, userAgent?.slice(0, 200) ?? null],
    client,
  );
  return serializeCookie(sessionCookieName(), token, SESSION_DAYS * 86400);
}

export function sessionTokenHash(request: Request): string | null {
  const token = readCookie(request.headers.get("cookie"), sessionCookieName());
  return token ? sha256(token) : null;
}

export async function sessionUser(request: Request): Promise<SessionUser | null> {
  const tokenHash = sessionTokenHash(request);
  if (!tokenHash) return null;
  const row = await one<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    stale: boolean;
  }>(
    `select u.id, u.display_name, u.avatar_url, s.last_seen_at < now() - make_interval(mins => $3) as stale
     from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now() and s.last_seen_at > now() - make_interval(days => $2)`,
    [tokenHash, IDLE_DAYS, TOUCH_MINUTES],
  );
  if (!row) return null;
  if (row.stale)
    await rows(`update sessions set last_seen_at = now() where token_hash = $1`, [tokenHash]);
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url };
}

/**
 * End the request's session. One Set-Cookie per cookie: a Lax clear does not
 * match the partitioned embed challenge.
 */
export async function destroySession(request: Request): Promise<string[]> {
  const tokenHash = sessionTokenHash(request);
  if (tokenHash) await rows(`delete from sessions where token_hash = $1`, [tokenHash]);
  return [
    serializeCookie(sessionCookieName(), "", 0),
    serializeEmbedChallenge("", 0),
    serializeCookie(challengeCookieName(), "", 0),
  ];
}

/** Sign the user out everywhere, optionally keeping one session (the one making the change). */
export async function revokeSessions(
  userId: string,
  keepTokenHash: string | null,
  client?: Queryable,
): Promise<void> {
  await rows(
    `delete from sessions where user_id = $1 and token_hash is distinct from $2`,
    [userId, keepTokenHash],
    client,
  );
}

export async function countSessions(userId: string): Promise<number> {
  const row = await one<{ n: number }>(
    `select count(*)::int as n from sessions where user_id = $1 and expires_at > now()`,
    [userId],
  );
  return row?.n ?? 0;
}
