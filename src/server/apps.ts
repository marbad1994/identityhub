import {
  parseScopes,
  platformInfo,
  platformLabel,
  type PlatformId,
  type ScopeId,
} from "@/lib/platforms";
import { one, rows, tx } from "./db";
import {
  decryptSecret,
  encryptOptional,
  encryptSecret,
  hashesEqual,
  randomToken,
  sha256,
} from "./crypto";
import { credentials, platform } from "./platforms";
import { logActivity } from "./activity";
import { listAccounts, type AccountView, type Result } from "./workspace";

const CODE_MINUTES = 10;
/** Refresh a platform token this long before it expires. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

type AppRow = {
  id: string;
  name: string;
  homepage_url: string;
  redirect_uris: string[];
  client_secret_hash: string;
};

async function appByClientId(clientId: string): Promise<AppRow | undefined> {
  return one<AppRow>(
    `select id, name, homepage_url, redirect_uris, client_secret_hash from apps where client_id = $1`,
    [clientId],
  );
}

// ---------------------------------------------------------------------------
// Consent (browser, signed in)
// ---------------------------------------------------------------------------

export type AuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  state?: string;
  scope?: string;
};

export type ConsentView = {
  app: { name: string; homepageUrl: string };
  scopes: ScopeId[];
  accounts: (AccountView & { grantable: ScopeId[]; granted: boolean })[];
};

/** Validate an authorization request. Errors here must not redirect: the redirect URI is not trusted yet. */
export async function consentView(
  userId: string | null,
  request: AuthorizeRequest,
): Promise<Result<{ view: ConsentView | null; app: { name: string; homepageUrl: string } }>> {
  const app = await appByClientId(request.clientId);
  if (!app) return { ok: false, error: "Unknown client_id." };
  if (!app.redirect_uris.includes(request.redirectUri))
    return { ok: false, error: "redirect_uri is not registered for this app." };
  const scopes = parseScopes(request.scope || "profile");
  if (scopes.length === 0)
    return { ok: false, error: "scope must include profile and/or publish." };
  const summary = { name: app.name, homepageUrl: app.homepage_url };
  if (!userId) return { ok: true, view: null, app: summary };

  const granted = new Set(
    (
      await rows<{ account_id: string }>(
        `select account_id from app_grants where user_id = $1 and app_id = $2`,
        [userId, app.id],
      )
    ).map((row) => row.account_id),
  );
  const accounts = (await listAccounts(userId)).map((account) => ({
    ...account,
    grantable: scopes.filter((scope) => platformInfo(account.provider)?.scopes.includes(scope)),
    granted: granted.has(account.id),
  }));
  return { ok: true, view: { app: summary, scopes, accounts }, app: summary };
}

function redirectWith(redirectUri: string, params: Record<string, string | undefined>): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params))
    if (value !== undefined) url.searchParams.set(key, value);
  return url.toString();
}

/** The person allowed the app: store the grants and hand the app a one-time code. */
export async function approve(
  userId: string,
  request: AuthorizeRequest & { accountIds: string[] },
): Promise<Result<{ redirect: string }>> {
  const checked = await consentView(userId, request);
  if (!checked.ok) return checked;
  const view = checked.view!;
  const app = (await appByClientId(request.clientId))!;
  const chosen = view.accounts.filter(
    (account) => request.accountIds.includes(account.id) && account.grantable.length > 0,
  );
  if (chosen.length === 0) return { ok: false, error: "Choose at least one account to share." };

  const code = randomToken("code_");
  await tx(async (client) => {
    await rows(
      `delete from app_grants where user_id = $1 and app_id = $2`,
      [userId, app.id],
      client,
    );
    for (const account of chosen) {
      await rows(
        `insert into app_grants (user_id, app_id, account_id, scopes) values ($1, $2, $3, $4)`,
        [userId, app.id, account.id, account.grantable.join(" ")],
        client,
      );
    }
    await rows(
      `insert into auth_codes (code_hash, user_id, app_id, redirect_uri, expires_at) values ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
      [sha256(code), userId, app.id, request.redirectUri, CODE_MINUTES],
      client,
    );
  });
  await logActivity(
    userId,
    "App authorized",
    `${app.name} may use ${chosen.map((a) => `${platformLabel(a.provider)} ${a.handle} (${a.grantable.join(", ")})`).join("; ")}`,
  );
  return { ok: true, redirect: redirectWith(request.redirectUri, { code, state: request.state }) };
}

export async function deny(request: AuthorizeRequest): Promise<Result<{ redirect: string }>> {
  const checked = await consentView(null, request);
  if (!checked.ok) return checked;
  return {
    ok: true,
    redirect: redirectWith(request.redirectUri, { error: "access_denied", state: request.state }),
  };
}

// ---------------------------------------------------------------------------
// App API (server to server)
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Client credentials from HTTP Basic auth or the request body. */
async function authenticateClient(request: Request, body: Record<string, string>): Promise<AppRow> {
  let clientId = body.client_id;
  let clientSecret = body.client_secret;
  const header = request.headers.get("authorization") ?? "";
  if (header.toLowerCase().startsWith("basic ")) {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const split = decoded.indexOf(":");
    clientId = decodeURIComponent(decoded.slice(0, split));
    clientSecret = decodeURIComponent(decoded.slice(split + 1));
  }
  const app = clientId ? await appByClientId(clientId) : undefined;
  if (!app || !clientSecret || !hashesEqual(app.client_secret_hash, sha256(clientSecret))) {
    throw new ApiError(401, "invalid_client", "Unknown client or wrong client secret.");
  }
  return app;
}

export async function readBody(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return Object.fromEntries(
      Object.entries(json ?? {}).map(([key, value]) => [key, String(value ?? "")]),
    );
  }
  return Object.fromEntries(new URLSearchParams(await request.text()));
}

type UserRow = { id: string; display_name: string; avatar_url: string | null };

async function grantedAccounts(userId: string, appId: string) {
  const found = await rows<{
    id: string;
    provider: PlatformId;
    account_id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    scopes: string;
  }>(
    `select a.id, a.provider, a.account_id, a.handle, a.display_name, a.avatar_url, g.scopes
     from app_grants g join accounts a on a.id = g.account_id
     where g.user_id = $1 and g.app_id = $2 order by a.provider, a.display_name`,
    [userId, appId],
  );
  return found.map((row) => ({
    id: row.id,
    platform: row.provider,
    platform_account_id: row.account_id,
    handle: row.handle,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    scopes: parseScopes(row.scopes),
  }));
}

async function identityPayload(userId: string, appId: string) {
  const user = (await one<UserRow>(`select id, display_name, avatar_url from users where id = $1`, [
    userId,
  ]))!;
  return {
    user: { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url },
    accounts: await grantedAccounts(userId, appId),
  };
}

/** POST /api/v1/oauth/token: trade a one-time code for an app access token. */
export async function exchangeCode(request: Request) {
  const body = await readBody(request);
  const app = await authenticateClient(request, body);
  if ((body.grant_type ?? "authorization_code") !== "authorization_code") {
    throw new ApiError(400, "unsupported_grant_type", "Only authorization_code is supported.");
  }
  const used = await one<{ user_id: string; redirect_uri: string; expires_at: Date }>(
    `update auth_codes set used_at = now() where code_hash = $1 and app_id = $2 and used_at is null
     returning user_id, redirect_uri, expires_at`,
    [sha256(body.code ?? ""), app.id],
  );
  if (!used || used.expires_at.getTime() < Date.now() || used.redirect_uri !== body.redirect_uri) {
    throw new ApiError(
      400,
      "invalid_grant",
      "The code is unknown, used, expired, or redirect_uri does not match.",
    );
  }
  const token = randomToken("ihub_at_");
  await rows(`insert into app_tokens (token_hash, user_id, app_id) values ($1, $2, $3)`, [
    sha256(token),
    used.user_id,
    app.id,
  ]);
  return {
    access_token: token,
    token_type: "Bearer",
    ...(await identityPayload(used.user_id, app.id)),
  };
}

/** Resolve the `Authorization: Bearer ihub_at_...` header to the user and app it belongs to. */
async function authenticateToken(request: Request): Promise<{ userId: string; appId: string }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const row = token
    ? await one<{ user_id: string; app_id: string }>(
        `update app_tokens set last_used_at = now() where token_hash = $1 returning user_id, app_id`,
        [sha256(token)],
      )
    : undefined;
  if (!row) throw new ApiError(401, "invalid_token", "Missing, unknown or revoked access token.");
  return { userId: row.user_id, appId: row.app_id };
}

/** GET /api/v1/me: the person and the accounts they granted this app. */
export async function me(request: Request) {
  const { userId, appId } = await authenticateToken(request);
  return identityPayload(userId, appId);
}

/**
 * POST /api/v1/accounts/{id}/token: a usable platform access token for an
 * account granted with `publish`, refreshed first when it is about to expire.
 */
export async function accountToken(request: Request, accountId: string) {
  const { userId, appId } = await authenticateToken(request);
  return tx(async (client) => {
    // Row lock: two concurrent refreshes would burn a rotating refresh token.
    const row = await one<{
      provider: string;
      account_id: string;
      access_token: string;
      refresh_token: string | null;
      token_expires_at: Date | null;
      scopes: string;
    }>(
      `select a.provider, a.account_id, a.access_token, a.refresh_token, a.token_expires_at, g.scopes
       from app_grants g join accounts a on a.id = g.account_id
       where g.user_id = $1 and g.app_id = $2 and g.account_id = $3 for update of a`,
      [userId, appId, accountId],
      client,
    );
    if (!row) throw new ApiError(404, "not_found", "That account is not granted to this app.");
    if (!parseScopes(row.scopes).includes("publish")) {
      throw new ApiError(
        403,
        "insufficient_scope",
        "The person did not grant publish access to this account.",
      );
    }
    let accessToken = decryptSecret(row.access_token);
    let expiresAt = row.token_expires_at;
    if (expiresAt && expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS) {
      const p = platform(row.provider);
      const creds = p ? credentials(p) : null;
      if (!p?.refresh || !creds)
        throw new ApiError(
          409,
          "reconnect_required",
          "The token expired and cannot be refreshed. Ask the person to reconnect.",
        );
      try {
        const next = await p.refresh({
          creds,
          tokens: {
            accountId: row.account_id,
            accessToken,
            refreshToken: row.refresh_token ? decryptSecret(row.refresh_token) : null,
          },
        });
        accessToken = next.accessToken;
        expiresAt = next.expiresAt;
        await rows(
          `update accounts set access_token = $2, refresh_token = coalesce($3, refresh_token), token_expires_at = $4 where id = $1`,
          [
            accountId,
            encryptSecret(next.accessToken),
            encryptOptional(next.refreshToken),
            next.expiresAt,
          ],
          client,
        );
      } catch (error) {
        throw new ApiError(
          409,
          "reconnect_required",
          error instanceof Error ? error.message : "Refresh failed; reconnect the account.",
        );
      }
    }
    return {
      access_token: accessToken,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      platform: row.provider,
      platform_account_id: row.account_id,
    };
  });
}

/** POST /api/v1/oauth/revoke: the app gives up a token (RFC 7009: always 200). */
export async function revokeToken(request: Request) {
  const body = await readBody(request);
  const app = await authenticateClient(request, body);
  await rows(`delete from app_tokens where token_hash = $1 and app_id = $2`, [
    sha256(body.token ?? ""),
    app.id,
  ]);
  return {};
}
