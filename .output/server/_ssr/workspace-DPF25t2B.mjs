import { r as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { a as platformLabel, o as validRedirectUri, r as parseScopes, t as PLATFORMS } from "./platforms-BdWV-H2d.mjs";
import { a as rows, i as one, s as tx } from "./db-9EsWRqP0.mjs";
import { c as uid, o as randomToken, s as sha256 } from "./crypto-B4IhR8Z6.mjs";
import { i as logActivity, r as enabledPlatforms } from "./activity-92JLjaS9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-DPF25t2B.js
var workspace_DPF25t2B_exports = /* @__PURE__ */ __exportAll({
	n: () => workspace_exports,
	t: () => listAccounts
});
var workspace_exports = /* @__PURE__ */ __exportAll$1({
	createApp: () => createApp,
	deleteApp: () => deleteApp,
	deleteUser: () => deleteUser,
	disconnectAccount: () => disconnectAccount,
	getWorkspace: () => getWorkspace,
	listAccounts: () => listAccounts,
	platformsForLogin: () => platformsForLogin,
	revokeApp: () => revokeApp,
	rotateAppSecret: () => rotateAppSecret,
	updateApp: () => updateApp
});
var iso = (value) => new Date(value).toISOString();
async function listAccounts(userId) {
	return (await rows(`select id, provider, handle, display_name, avatar_url, connected_at from accounts where user_id = $1 order by provider, display_name`, [userId])).map((row) => ({
		id: row.id,
		provider: row.provider,
		handle: row.handle,
		displayName: row.display_name,
		avatarUrl: row.avatar_url,
		connectedAt: iso(row.connected_at)
	}));
}
async function getWorkspace(user) {
	const grants = await rows(`select g.app_id, a.name, a.homepage_url, g.account_id, g.scopes
     from app_grants g join apps a on a.id = g.app_id where g.user_id = $1 order by a.name`, [user.id]);
	const authorized = /* @__PURE__ */ new Map();
	for (const grant of grants) {
		const app = authorized.get(grant.app_id) ?? {
			appId: grant.app_id,
			name: grant.name,
			homepageUrl: grant.homepage_url,
			grants: []
		};
		app.grants.push({
			accountId: grant.account_id,
			scopes: parseScopes(grant.scopes)
		});
		authorized.set(grant.app_id, app);
	}
	const apps = await rows(`select id, name, homepage_url, redirect_uris, client_id, created_at from apps where owner_id = $1 order by created_at`, [user.id]);
	const activity = await rows(`select id, action, detail, created_at from activity where user_id = $1 order by created_at desc limit 50`, [user.id]);
	return {
		user,
		accounts: await listAccounts(user.id),
		authorizedApps: [...authorized.values()],
		developerApps: apps.map((app) => ({
			id: app.id,
			name: app.name,
			homepageUrl: app.homepage_url,
			redirectUris: app.redirect_uris,
			clientId: app.client_id,
			createdAt: iso(app.created_at)
		})),
		activity: activity.map((row) => ({
			id: row.id,
			action: row.action,
			detail: row.detail,
			at: iso(row.created_at)
		}))
	};
}
async function disconnectAccount(userId, accountId) {
	const removed = await one(`delete from accounts where id = $1 and user_id = $2 returning provider, handle`, [accountId, userId]);
	if (!removed) return {
		ok: false,
		error: "That account is not connected."
	};
	await logActivity(userId, "Disconnected", `${platformLabel(removed.provider)} ${removed.handle}; apps lost access to it`);
	return { ok: true };
}
/** Remove every grant and token a person gave one app. */
async function revokeApp(userId, appId) {
	const app = await one(`select name from apps where id = $1`, [appId]);
	if (!app) return {
		ok: false,
		error: "That app no longer exists."
	};
	await tx(async (client) => {
		await rows(`delete from app_grants where user_id = $1 and app_id = $2`, [userId, appId], client);
		await rows(`delete from app_tokens where user_id = $1 and app_id = $2`, [userId, appId], client);
		await rows(`delete from auth_codes where user_id = $1 and app_id = $2`, [userId, appId], client);
	});
	await logActivity(userId, "App access removed", app.name);
	return { ok: true };
}
function cleanRedirectUris(input) {
	const uris = [...new Set(input.map((value) => value.trim()).filter(Boolean))];
	if (uris.length === 0 || uris.length > 10 || !uris.every(validRedirectUri)) return null;
	return uris;
}
async function createApp(userId, input) {
	const name = input.name.trim().slice(0, 60);
	if (name.length < 2) return {
		ok: false,
		error: "Name the app in at least two characters."
	};
	if (!validRedirectUri(input.homepageUrl.trim())) return {
		ok: false,
		error: "Use an https homepage URL."
	};
	const redirectUris = cleanRedirectUris(input.redirectUris);
	if (!redirectUris) return {
		ok: false,
		error: "Add one to ten https redirect URIs, one per line, without a #fragment."
	};
	if (((await one(`select count(*)::int as n from apps where owner_id = $1`, [userId]))?.n ?? 0) >= 25) return {
		ok: false,
		error: "This account already owns the maximum of 25 apps."
	};
	const clientId = randomToken("ihub_pk_");
	const clientSecret = randomToken("ihub_sk_");
	await rows(`insert into apps (id, owner_id, name, homepage_url, redirect_uris, client_id, client_secret_hash) values ($1, $2, $3, $4, $5, $6, $7)`, [
		uid(),
		userId,
		name,
		input.homepageUrl.trim(),
		redirectUris,
		clientId,
		sha256(clientSecret)
	]);
	await logActivity(userId, "App registered", name);
	return {
		ok: true,
		clientId,
		clientSecret
	};
}
async function updateApp(userId, input) {
	const name = input.name.trim().slice(0, 60);
	if (name.length < 2) return {
		ok: false,
		error: "Name the app in at least two characters."
	};
	if (!validRedirectUri(input.homepageUrl.trim())) return {
		ok: false,
		error: "Use an https homepage URL."
	};
	const redirectUris = cleanRedirectUris(input.redirectUris);
	if (!redirectUris) return {
		ok: false,
		error: "Add one to ten https redirect URIs, one per line, without a #fragment."
	};
	return await one(`update apps set name = $3, homepage_url = $4, redirect_uris = $5 where id = $1 and owner_id = $2 returning id`, [
		input.appId,
		userId,
		name,
		input.homepageUrl.trim(),
		redirectUris
	]) ? { ok: true } : {
		ok: false,
		error: "That app is not yours."
	};
}
async function rotateAppSecret(userId, appId) {
	const clientSecret = randomToken("ihub_sk_");
	const updated = await one(`update apps set client_secret_hash = $3 where id = $1 and owner_id = $2 returning name`, [
		appId,
		userId,
		sha256(clientSecret)
	]);
	if (!updated) return {
		ok: false,
		error: "That app is not yours."
	};
	await logActivity(userId, "App secret rotated", updated.name);
	return {
		ok: true,
		clientSecret
	};
}
async function deleteApp(userId, appId) {
	const removed = await one(`delete from apps where id = $1 and owner_id = $2 returning name`, [appId, userId]);
	if (!removed) return {
		ok: false,
		error: "That app is not yours."
	};
	await logActivity(userId, "App deleted", `${removed.name}; every grant and token for it was removed`);
	return { ok: true };
}
/** Delete the user and, by cascade, every account, token, grant, app and log entry. */
async function deleteUser(userId) {
	await rows(`delete from users where id = $1`, [userId]);
}
function platformsForLogin() {
	const enabled = new Set(enabledPlatforms());
	return PLATFORMS.filter((p) => enabled.has(p.id)).map((p) => ({
		id: p.id,
		label: p.label
	}));
}
//#endregion
export { workspace_DPF25t2B_exports as n, listAccounts as t };
