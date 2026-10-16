import type pg from "pg";
import { platformLabel } from "@/lib/platforms";
import { one, rows, tx } from "./db";
import { encryptOptional, encryptSecret, pkcePair, randomToken, uid } from "./crypto";
import { appOrigin } from "./env";
import { callbackUrl, credentials, HUB_STATE_PREFIX, platform } from "./platforms";
import { completeRelay, relayHash, validRelay } from "./relay";
import type { PlatformLogin } from "./platforms/types";
import { createSession, type SessionUser } from "./session";
import { logActivity } from "./activity";

const STATE_MINUTES = 10;

/** Only same-site relative paths may be returned to after a platform round trip. */
export function safeReturnTo(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\"))
    return fallback;
  return value;
}

/** Where to send the browser next; `relayed` means a popup finished and should close. */
type Redirect = { location: string; setCookie?: string; relayed?: boolean };

function withError(path: string, message: string): string {
  const url = new URL(path, appOrigin());
  url.searchParams.set("error", message);
  return `${url.pathname}${url.search}`;
}

/** Start a platform authorization. `user` is required to connect, and absent to sign in. */
export async function beginAuthorization(input: {
  provider: string;
  intent: "login" | "connect";
  returnTo: string;
  user: SessionUser | null;
  /** Set when the sign-in runs in a popup opened by a hub page. */
  relay?: string | null;
}): Promise<Redirect> {
  const p = platform(input.provider);
  const fallback = input.intent === "connect" ? "/workspace" : "/login";
  if (!p) return { location: withError(fallback, "That platform is not supported.") };
  const creds = credentials(p);
  if (!creds)
    return {
      location: withError(fallback, `${platformLabel(p.id)} is not configured on this hub yet.`),
    };
  if (input.intent === "connect" && !input.user) return { location: "/login" };

  const { verifier, challenge } = pkcePair();
  const state = randomToken(HUB_STATE_PREFIX);
  await rows(`delete from oauth_states where expires_at < now()`);
  await rows(
    `insert into oauth_states (state, intent, user_id, provider, verifier, return_to, relay_hash, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, now() + make_interval(mins => $8))`,
    [
      state,
      input.intent,
      input.user?.id ?? null,
      p.id,
      verifier,
      input.returnTo,
      validRelay(input.relay) ? relayHash(input.relay) : null,
      STATE_MINUTES,
    ],
  );
  return { location: p.authorizeUrl({ creds, redirectUri: callbackUrl(p.id), state, challenge }) };
}

async function upsertAccounts(
  client: pg.PoolClient,
  userId: string,
  provider: string,
  login: PlatformLogin,
) {
  for (const account of login.accounts) {
    await rows(
      `insert into accounts (id, user_id, provider, account_id, handle, display_name, avatar_url,
                             access_token, refresh_token, token_expires_at, platform_scopes)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (user_id, provider, account_id) do update set
         handle = excluded.handle,
         display_name = excluded.display_name,
         avatar_url = excluded.avatar_url,
         access_token = excluded.access_token,
         refresh_token = coalesce(excluded.refresh_token, accounts.refresh_token),
         token_expires_at = excluded.token_expires_at,
         platform_scopes = excluded.platform_scopes,
         connected_at = now()`,
      [
        uid(),
        userId,
        provider,
        account.accountId,
        account.handle.slice(0, 120),
        account.displayName.slice(0, 120),
        account.avatarUrl,
        encryptSecret(account.accessToken),
        encryptOptional(account.refreshToken),
        account.expiresAt,
        account.platformScopes,
      ],
      client,
    );
  }
}

/** Resolve the hub user for a platform identity, creating one on first sign-in. */
async function userForLogin(
  client: pg.PoolClient,
  provider: string,
  login: PlatformLogin,
): Promise<string> {
  const existing = await one<{ user_id: string }>(
    `select user_id from user_logins where provider = $1 and subject = $2`,
    [provider, login.subject.id],
    client,
  );
  if (existing) {
    await rows(
      `update users set display_name = $2, avatar_url = coalesce($3, avatar_url) where id = $1`,
      [existing.user_id, login.subject.displayName.slice(0, 120), login.subject.avatarUrl],
      client,
    );
    return existing.user_id;
  }
  const userId = uid();
  await rows(
    `insert into users (id, display_name, avatar_url) values ($1, $2, $3)`,
    [userId, login.subject.displayName.slice(0, 120), login.subject.avatarUrl],
    client,
  );
  await rows(
    `insert into user_logins (provider, subject, user_id) values ($1, $2, $3)`,
    [provider, login.subject.id, userId],
    client,
  );
  return userId;
}

/** Handle the platform's redirect back to `/api/auth/callback/<provider>`. */
export async function finishAuthorization(provider: string, request: Request): Promise<Redirect> {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const pending = await one<{
    intent: "login" | "connect";
    user_id: string | null;
    provider: string;
    verifier: string;
    return_to: string;
    relay_hash: string | null;
  }>(
    `delete from oauth_states where state = $1 and expires_at > now()
     returning intent, user_id, provider, verifier, return_to, relay_hash`,
    [state],
  );
  if (!pending || pending.provider !== provider) {
    return {
      location: withError(
        "/login",
        "That sign-in attempt expired or was already used. Start again.",
      ),
    };
  }
  const result = await settle(provider, url, pending, request);
  if (!pending.relay_hash) return result;
  // Signed in from a popup: hand the destination to the opener and let the popup close.
  await completeRelay(pending.relay_hash, result.location);
  return { ...result, relayed: true };
}

async function settle(
  provider: string,
  url: URL,
  pending: {
    intent: "login" | "connect";
    user_id: string | null;
    verifier: string;
    return_to: string;
  },
  request: Request,
): Promise<Redirect> {
  const fallback = pending.intent === "connect" ? "/workspace" : "/login";
  const p = platform(provider);
  const creds = p ? credentials(p) : null;
  if (!p || !creds)
    return { location: withError(fallback, "This platform is no longer configured.") };

  const code = url.searchParams.get("code");
  if (!code) {
    const reason =
      url.searchParams.get("error_description") ??
      url.searchParams.get("error") ??
      "The platform did not return a code.";
    return { location: withError(fallback, reason) };
  }

  let login: PlatformLogin;
  try {
    login = await p.exchange({
      creds,
      code,
      redirectUri: callbackUrl(p.id),
      verifier: pending.verifier,
    });
  } catch (error) {
    return {
      location: withError(
        fallback,
        error instanceof Error ? error.message : "The platform rejected the sign-in.",
      ),
    };
  }
  if (pending.intent === "connect" && login.accounts.length === 0) {
    return {
      location: withError(
        fallback,
        `No ${platformLabel(p.id)} accounts were shared. Facebook needs at least one Page you manage.`,
      ),
    };
  }

  const label = platformLabel(p.id);
  return tx(async (client) => {
    if (pending.intent === "connect" && pending.user_id) {
      await upsertAccounts(client, pending.user_id, p.id, login);
      // Let this identity sign in to the same user, unless it already belongs to someone else.
      await rows(
        `insert into user_logins (provider, subject, user_id) values ($1, $2, $3) on conflict do nothing`,
        [p.id, login.subject.id, pending.user_id],
        client,
      );
      await logActivity(
        pending.user_id,
        "Connected",
        `${login.accounts.length} ${label} account(s): ${login.accounts.map((a) => a.handle).join(", ")}`,
        client,
      );
      return { location: safeReturnTo(pending.return_to, "/workspace") };
    }
    const userId = await userForLogin(client, p.id, login);
    await upsertAccounts(client, userId, p.id, login);
    await logActivity(userId, "Signed in", `With ${label} as ${login.subject.displayName}`, client);
    const setCookie = await createSession(userId, request.headers.get("user-agent"), client);
    return { location: safeReturnTo(pending.return_to, "/workspace"), setCookie };
  });
}
