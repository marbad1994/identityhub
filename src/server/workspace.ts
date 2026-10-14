import {
  parseScopes,
  platformLabel,
  validRedirectUri,
  type PlatformId,
  type ScopeId,
} from "@/lib/platforms";
import { one, rows, tx } from "./db";
import { randomToken, sha256, uid } from "./crypto";
import { effectiveMethods, isMethod, type MethodView } from "./methods";
import { logActivity } from "./activity";
import type { SessionUser } from "./session";

export type AccountView = {
  id: string;
  provider: PlatformId;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  connectedAt: string;
};

export type AuthorizedAppView = {
  appId: string;
  name: string;
  homepageUrl: string;
  grants: { accountId: string; scopes: ScopeId[] }[];
};

export type DeveloperAppView = {
  id: string;
  name: string;
  homepageUrl: string;
  redirectUris: string[];
  clientId: string;
  createdAt: string;
  /** Saved choice; empty means every available method. */
  signInMethods: string[];
  /** What the widget shows today. */
  methods: MethodView[];
  widgetTheme: "light" | "dark";
};

export type ActivityView = { id: string; action: string; detail: string; at: string };

export type WorkspaceView = {
  user: SessionUser;
  accounts: AccountView[];
  authorizedApps: AuthorizedAppView[];
  activity: ActivityView[];
};

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const iso = (value: Date | string) => new Date(value).toISOString();

export async function listAccounts(userId: string): Promise<AccountView[]> {
  const found = await rows<{
    id: string;
    provider: PlatformId;
    handle: string;
    display_name: string;
    avatar_url: string | null;
    connected_at: Date;
  }>(
    `select id, provider, handle, display_name, avatar_url, connected_at from accounts where user_id = $1 order by provider, display_name`,
    [userId],
  );
  return found.map((row) => ({
    id: row.id,
    provider: row.provider,
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    connectedAt: iso(row.connected_at),
  }));
}

export async function getWorkspace(user: SessionUser): Promise<WorkspaceView> {
  const grants = await rows<{
    app_id: string;
    name: string;
    homepage_url: string;
    account_id: string;
    scopes: string;
  }>(
    `select g.app_id, a.name, a.homepage_url, g.account_id, g.scopes
     from app_grants g join apps a on a.id = g.app_id where g.user_id = $1 order by a.name`,
    [user.id],
  );
  const authorized = new Map<string, AuthorizedAppView>();
  for (const grant of grants) {
    const app = authorized.get(grant.app_id) ?? {
      appId: grant.app_id,
      name: grant.name,
      homepageUrl: grant.homepage_url,
      grants: [],
    };
    app.grants.push({ accountId: grant.account_id, scopes: parseScopes(grant.scopes) });
    authorized.set(grant.app_id, app);
  }
  const activity = await rows<{ id: string; action: string; detail: string; created_at: Date }>(
    `select id, action, detail, created_at from activity where user_id = $1 order by created_at desc limit 50`,
    [user.id],
  );
  return {
    user,
    accounts: await listAccounts(user.id),
    authorizedApps: [...authorized.values()],
    activity: activity.map((row) => ({
      id: row.id,
      action: row.action,
      detail: row.detail,
      at: iso(row.created_at),
    })),
  };
}

export async function disconnectAccount(userId: string, accountId: string): Promise<Result> {
  const removed = await one<{ provider: string; handle: string }>(
    `delete from accounts where id = $1 and user_id = $2 returning provider, handle`,
    [accountId, userId],
  );
  if (!removed) return { ok: false, error: "That account is not connected." };
  await logActivity(
    userId,
    "Disconnected",
    `${platformLabel(removed.provider)} ${removed.handle}; apps lost access to it`,
  );
  return { ok: true };
}

/** Remove every grant and token a person gave one app. */
export async function revokeApp(userId: string, appId: string): Promise<Result> {
  const app = await one<{ name: string }>(`select name from apps where id = $1`, [appId]);
  if (!app) return { ok: false, error: "That app no longer exists." };
  await tx(async (client) => {
    await rows(
      `delete from app_grants where user_id = $1 and app_id = $2`,
      [userId, appId],
      client,
    );
    await rows(
      `delete from app_tokens where user_id = $1 and app_id = $2`,
      [userId, appId],
      client,
    );
    await rows(
      `delete from auth_codes where user_id = $1 and app_id = $2`,
      [userId, appId],
      client,
    );
  });
  await logActivity(userId, "App access removed", app.name);
  return { ok: true };
}

function cleanRedirectUris(input: string[]): string[] | null {
  const uris = [...new Set(input.map((value) => value.trim()).filter(Boolean))];
  if (uris.length === 0 || uris.length > 10 || !uris.every(validRedirectUri)) return null;
  return uris;
}

export async function createApp(
  userId: string,
  input: { name: string; homepageUrl: string; redirectUris: string[] },
): Promise<Result<{ appId: string; clientId: string; clientSecret: string }>> {
  const name = input.name.trim().slice(0, 60);
  if (name.length < 2) return { ok: false, error: "Name the app in at least two characters." };
  if (!validRedirectUri(input.homepageUrl.trim()))
    return { ok: false, error: "Use an https homepage URL." };
  const redirectUris = cleanRedirectUris(input.redirectUris);
  if (!redirectUris)
    return {
      ok: false,
      error: "Add one to ten https redirect URIs, one per line, without a #fragment.",
    };
  const count = await one<{ n: number }>(
    `select count(*)::int as n from apps where owner_id = $1`,
    [userId],
  );
  if ((count?.n ?? 0) >= 25)
    return { ok: false, error: "This account already owns the maximum of 25 apps." };
  const appId = uid();
  const clientId = randomToken("ihub_pk_");
  const clientSecret = randomToken("ihub_sk_");
  await rows(
    `insert into apps (id, owner_id, name, homepage_url, redirect_uris, client_id, client_secret_hash) values ($1, $2, $3, $4, $5, $6, $7)`,
    [appId, userId, name, input.homepageUrl.trim(), redirectUris, clientId, sha256(clientSecret)],
  );
  await logActivity(userId, "App registered", name);
  return { ok: true, appId, clientId, clientSecret };
}

export async function updateApp(
  userId: string,
  input: { appId: string; name: string; homepageUrl: string; redirectUris: string[] },
): Promise<Result> {
  const name = input.name.trim().slice(0, 60);
  if (name.length < 2) return { ok: false, error: "Name the app in at least two characters." };
  if (!validRedirectUri(input.homepageUrl.trim()))
    return { ok: false, error: "Use an https homepage URL." };
  const redirectUris = cleanRedirectUris(input.redirectUris);
  if (!redirectUris)
    return {
      ok: false,
      error: "Add one to ten https redirect URIs, one per line, without a #fragment.",
    };
  const updated = await one(
    `update apps set name = $3, homepage_url = $4, redirect_uris = $5 where id = $1 and owner_id = $2 returning id`,
    [input.appId, userId, name, input.homepageUrl.trim(), redirectUris],
  );
  return updated ? { ok: true } : { ok: false, error: "That app is not yours." };
}

export async function rotateAppSecret(
  userId: string,
  appId: string,
): Promise<Result<{ clientSecret: string }>> {
  const clientSecret = randomToken("ihub_sk_");
  const updated = await one<{ name: string }>(
    `update apps set client_secret_hash = $3 where id = $1 and owner_id = $2 returning name`,
    [appId, userId, sha256(clientSecret)],
  );
  if (!updated) return { ok: false, error: "That app is not yours." };
  await logActivity(userId, "App secret rotated", updated.name);
  return { ok: true, clientSecret };
}

export async function deleteApp(userId: string, appId: string): Promise<Result> {
  const removed = await one<{ name: string }>(
    `delete from apps where id = $1 and owner_id = $2 returning name`,
    [appId, userId],
  );
  if (!removed) return { ok: false, error: "That app is not yours." };
  await logActivity(
    userId,
    "App deleted",
    `${removed.name}; every grant and token for it was removed`,
  );
  return { ok: true };
}

/** Delete the user and, by cascade, every account, token, grant, app and log entry. */
export async function deleteUser(userId: string): Promise<void> {
  await rows(`delete from users where id = $1`, [userId]);
}

type AppRow = {
  id: string;
  name: string;
  homepage_url: string;
  redirect_uris: string[];
  client_id: string;
  created_at: Date;
  sign_in_methods: string[];
  widget_theme: "light" | "dark";
};

const APP_COLUMNS = `id, name, homepage_url, redirect_uris, client_id, created_at, sign_in_methods, widget_theme`;

function appView(app: AppRow): DeveloperAppView {
  return {
    id: app.id,
    name: app.name,
    homepageUrl: app.homepage_url,
    redirectUris: app.redirect_uris,
    clientId: app.client_id,
    createdAt: iso(app.created_at),
    signInMethods: app.sign_in_methods,
    methods: effectiveMethods(app.sign_in_methods),
    widgetTheme: app.widget_theme,
  };
}

export async function listDeveloperApps(userId: string): Promise<DeveloperAppView[]> {
  const apps = await rows<AppRow>(
    `select ${APP_COLUMNS} from apps where owner_id = $1 order by created_at`,
    [userId],
  );
  return apps.map(appView);
}

export async function getDeveloperApp(
  userId: string,
  appId: string,
): Promise<DeveloperAppView | null> {
  const app = await one<AppRow>(`select ${APP_COLUMNS} from apps where id = $1 and owner_id = $2`, [
    appId,
    userId,
  ]);
  return app ? appView(app) : null;
}

/** Save which sign-in methods the app's widget and consent screen offer, and the widget theme. */
export async function updateWidget(
  userId: string,
  input: { appId: string; methods: string[]; theme: string },
): Promise<Result<{ app: DeveloperAppView }>> {
  const methods = [...new Set(input.methods)].filter(isMethod);
  if (methods.length === 0) return { ok: false, error: "Keep at least one sign-in method." };
  if (input.theme !== "light" && input.theme !== "dark")
    return { ok: false, error: "Choose light or dark." };
  const app = await one<AppRow>(
    `update apps set sign_in_methods = $3, widget_theme = $4 where id = $1 and owner_id = $2 returning ${APP_COLUMNS}`,
    [input.appId, userId, methods, input.theme],
  );
  return app ? { ok: true, app: appView(app) } : { ok: false, error: "That app is not yours." };
}
