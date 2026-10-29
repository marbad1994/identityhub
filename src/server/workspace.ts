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
import type { Queryable } from "./db";
import { forgetFrameAncestors } from "./frame-ancestors";
import type { SessionUser } from "./session";
import { WIDGET_ACCENTS, type WidgetAccent } from "@/lib/widget-appearance";

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

export type AppMemberView = {
  userId: string;
  displayName: string;
  email: string | null;
  /** Platform accounts this person let the app use, as "Instagram @name". */
  accounts: string[];
  lastUsedAt: string | null;
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
  widgetAccent: WidgetAccent;
};

export type DeveloperAppListItem = DeveloperAppView & { memberCount: number };

export type AppSummary = { memberCount: number; lastUsedAt: string | null };

export type AppGrantView = {
  kind: "grant" | "token";
  at: string;
  displayName: string;
  provider: string | null;
  handle: string | null;
  scopes: string | null;
  /** Token rows: whether last_used_at was set. Grant rows are always the latest consent. */
  used: boolean;
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
  if ((count?.n ?? 0) >= APP_CAP)
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
  const updated = await one<{ client_id: string }>(
    `update apps set name = $3, homepage_url = $4, redirect_uris = $5 where id = $1 and owner_id = $2 returning client_id`,
    [input.appId, userId, name, input.homepageUrl.trim(), redirectUris],
  );
  if (!updated) return { ok: false, error: "That app is not yours." };
  forgetFrameAncestors(updated.client_id);
  return { ok: true };
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
  const removed = await one<{ name: string; client_id: string }>(
    `delete from apps where id = $1 and owner_id = $2 returning name, client_id`,
    [appId, userId],
  );
  if (!removed) return { ok: false, error: "That app is not yours." };
  forgetFrameAncestors(removed.client_id);
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
  widget_accent: WidgetAccent;
};

/** Same ceiling as the error string from createApp. */
export const APP_CAP = 25;

const APP_COLUMNS = `id, name, homepage_url, redirect_uris, client_id, created_at, sign_in_methods, widget_theme, widget_accent`;

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
    widgetAccent: app.widget_accent,
  };
}

export async function listDeveloperApps(userId: string): Promise<DeveloperAppListItem[]> {
  const apps = await rows<AppRow>(
    `select ${APP_COLUMNS} from apps where owner_id = $1 order by created_at`,
    [userId],
  );
  if (apps.length === 0) return [];
  const counts = await rows<{ app_id: string; member_count: number }>(
    `select app_id, count(distinct user_id)::int as member_count
     from (
       select app_id, user_id from app_grants
       union
       select app_id, user_id from app_tokens
     ) s
     where app_id = any($1::text[])
     group by app_id`,
    [apps.map((app) => app.id)],
  );
  const byId = new Map(counts.map((row) => [row.app_id, row.member_count]));
  return apps.map((app) => ({ ...appView(app), memberCount: byId.get(app.id) ?? 0 }));
}

export async function appSummary(ownerId: string, appId: string): Promise<AppSummary | null> {
  const app = await one(`select id from apps where id = $1 and owner_id = $2`, [appId, ownerId]);
  if (!app) return null;
  const count = await one<{ n: number }>(
    `select count(distinct user_id)::int as n from (
       select user_id from app_grants where app_id = $1
       union
       select user_id from app_tokens where app_id = $1
     ) s`,
    [appId],
  );
  const last = await one<{ last_used_at: Date | null }>(
    `select max(last_used_at) as last_used_at from app_tokens where app_id = $1`,
    [appId],
  );
  return {
    memberCount: count?.n ?? 0,
    lastUsedAt: last?.last_used_at ? iso(last.last_used_at) : null,
  };
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

type MemberRow = {
  id: string;
  display_name: string;
  email: string | null;
  accounts: { provider: string; handle: string }[] | string | null;
  last_used_at: Date | null;
};

function memberAccounts(value: MemberRow["accounts"]): string[] {
  let list = value;
  if (typeof value === "string") {
    try {
      list = JSON.parse(value) as MemberRow["accounts"];
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  return list.map((account) => `${platformLabel(account.provider)} ${account.handle}`);
}

const MEMBER_ACCOUNTS_SQL = `coalesce(
  (select json_agg(json_build_object('provider', a.provider, 'handle', a.handle)
                   order by a.provider, a.handle)
   from app_grants g
   join accounts a on a.id = g.account_id
   where g.user_id = u.id and g.app_id = $1),
  '[]'::json
)`;

function memberView(row: MemberRow): AppMemberView {
  return {
    userId: row.id,
    displayName: row.display_name,
    email: row.email,
    accounts: memberAccounts(row.accounts),
    lastUsedAt: row.last_used_at ? iso(row.last_used_at) : null,
  };
}

/** People who have signed in to this app, or who still have a grant or token for it. */
export async function listAppMembers(ownerId: string, appId: string): Promise<AppMemberView[]> {
  const app = await one(`select id from apps where id = $1 and owner_id = $2`, [appId, ownerId]);
  if (!app) return [];
  const found = await rows<MemberRow>(
    `select u.id, u.display_name, u.email,
            ${MEMBER_ACCOUNTS_SQL} as accounts,
            (select max(t.last_used_at) from app_tokens t where t.user_id = u.id and t.app_id = $1) as last_used_at
     from users u
     where u.id in (
       select user_id from app_grants where app_id = $1
       union
       select user_id from app_tokens where app_id = $1
     )
     order by lower(u.display_name)`,
    [appId],
  );
  return found.map(memberView);
}

/** Overview only. Same account labels as listAppMembers, capped at five. */
export async function listRecentMembers(ownerId: string, appId: string): Promise<AppMemberView[]> {
  const app = await one(`select id from apps where id = $1 and owner_id = $2`, [appId, ownerId]);
  if (!app) return [];
  const found = await rows<MemberRow>(
    `select u.id, u.display_name, u.email,
            ${MEMBER_ACCOUNTS_SQL} as accounts,
            (select max(t.last_used_at) from app_tokens t where t.user_id = u.id and t.app_id = $1) as last_used_at
     from users u
     where u.id in (
       select user_id from app_grants where app_id = $1
       union
       select user_id from app_tokens where app_id = $1
     )
     order by last_used_at desc nulls last, lower(u.display_name)
     limit 5`,
    [appId],
  );
  return found.map(memberView);
}

/**
 * Current grants and tokens. Null when the caller does not own the app
 * (the route 404s). An empty array is a real snapshot with nothing in it.
 * No row cap: this is the current set. Add one if a single app passes a few hundred rows.
 */
export async function listAppGrants(
  ownerId: string,
  appId: string,
  client?: Queryable,
): Promise<AppGrantView[] | null> {
  const app = await one(
    `select id from apps where id = $1 and owner_id = $2`,
    [appId, ownerId],
    client,
  );
  if (!app) return null;
  const found = await rows<{
    kind: "grant" | "token";
    at: Date;
    display_name: string;
    provider: string | null;
    handle: string | null;
    scopes: string | null;
    used: boolean;
  }>(
    `select kind, at, display_name, provider, handle, scopes, used from (
       select 'grant'::text as kind, g.granted_at as at, u.display_name,
              a.provider, a.handle, g.scopes, true as used
       from app_grants g
       join users u on u.id = g.user_id
       join accounts a on a.id = g.account_id
       where g.app_id = $1
       union all
       select 'token'::text, coalesce(t.last_used_at, t.created_at), u.display_name,
              null::text, null::text, null::text, t.last_used_at is not null
       from app_tokens t
       join users u on u.id = t.user_id
       where t.app_id = $1
     ) e
     order by at desc`,
    [appId],
    client,
  );
  return found.map((row) => ({
    kind: row.kind,
    at: iso(row.at),
    displayName: row.display_name,
    provider: row.provider,
    handle: row.handle,
    scopes: row.scopes,
    used: row.used,
  }));
}

/** The app owner cuts one person off: their grants, tokens and unused codes for this app go away. */
export async function removeAppMember(
  ownerId: string,
  appId: string,
  memberUserId: string,
): Promise<Result> {
  const app = await one<{ name: string }>(`select name from apps where id = $1 and owner_id = $2`, [
    appId,
    ownerId,
  ]);
  if (!app) return { ok: false, error: "That app is not yours." };
  const member = await one<{ display_name: string }>(
    `select display_name from users where id = $1`,
    [memberUserId],
  );
  if (!member) return { ok: false, error: "That person is not signed in to this app." };
  const removed = await tx(async (client) => {
    const grants = await rows(
      `delete from app_grants where user_id = $1 and app_id = $2 returning user_id`,
      [memberUserId, appId],
      client,
    );
    const tokens = await rows(
      `delete from app_tokens where user_id = $1 and app_id = $2 returning user_id`,
      [memberUserId, appId],
      client,
    );
    const codes = await rows(
      `delete from auth_codes where user_id = $1 and app_id = $2 returning user_id`,
      [memberUserId, appId],
      client,
    );
    return grants.length + tokens.length + codes.length;
  });
  if (removed === 0) return { ok: false, error: "That person is not signed in to this app." };
  await logActivity(
    ownerId,
    "Member removed",
    `${member.display_name} can no longer use ${app.name}`,
  );
  await logActivity(memberUserId, "App access removed", app.name);
  return { ok: true };
}

/** Save which sign-in methods the app's widget and consent screen offer, and the widget theme. */
export async function updateWidget(
  userId: string,
  input: { appId: string; methods: string[]; theme: string; accent?: string },
): Promise<Result<{ app: DeveloperAppView }>> {
  const methods = [...new Set(input.methods)].filter(isMethod);
  if (methods.length === 0) return { ok: false, error: "Keep at least one sign-in method." };
  if (input.theme !== "light" && input.theme !== "dark")
    return { ok: false, error: "Choose light or dark." };
  if (input.accent !== undefined && !WIDGET_ACCENTS.includes(input.accent as WidgetAccent))
    return { ok: false, error: "Choose a supported accent color." };
  const app = await one<AppRow>(
    `update apps set sign_in_methods = $3, widget_theme = $4, widget_accent = coalesce($5, widget_accent) where id = $1 and owner_id = $2 returning ${APP_COLUMNS}`,
    [input.appId, userId, methods, input.theme, input.accent ?? null],
  );
  if (app) forgetFrameAncestors(app.client_id);
  return app ? { ok: true, app: appView(app) } : { ok: false, error: "That app is not yours." };
}
