import { a as platformLabel, i as platformInfo, r as parseScopes } from "./platforms-BdWV-H2d.mjs";
import { a as rows, i as one, s as tx } from "./db-9EsWRqP0.mjs";
import { i as hashesEqual, n as encryptOptional, o as randomToken, r as encryptSecret, s as sha256, t as decryptSecret } from "./crypto-B4IhR8Z6.mjs";
import { a as platform, i as logActivity, n as credentials } from "./activity-92JLjaS9.mjs";
import { t as listAccounts } from "./workspace-DPF25t2B.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/apps-B_TU16ag.js
var CODE_MINUTES = 10;
/** Refresh a platform token this long before it expires. */
var REFRESH_MARGIN_MS = 3e5;
async function appByClientId(clientId) {
	return one(`select id, name, homepage_url, redirect_uris, client_secret_hash from apps where client_id = $1`, [clientId]);
}
/** Validate an authorization request. Errors here must not redirect: the redirect URI is not trusted yet. */
async function consentView(userId, request) {
	const app = await appByClientId(request.clientId);
	if (!app) return {
		ok: false,
		error: "Unknown client_id."
	};
	if (!app.redirect_uris.includes(request.redirectUri)) return {
		ok: false,
		error: "redirect_uri is not registered for this app."
	};
	const scopes = parseScopes(request.scope || "profile");
	if (scopes.length === 0) return {
		ok: false,
		error: "scope must include profile and/or publish."
	};
	const summary = {
		name: app.name,
		homepageUrl: app.homepage_url
	};
	if (!userId) return {
		ok: true,
		view: null,
		app: summary
	};
	const granted = new Set((await rows(`select account_id from app_grants where user_id = $1 and app_id = $2`, [userId, app.id])).map((row) => row.account_id));
	return {
		ok: true,
		view: {
			app: summary,
			scopes,
			accounts: (await listAccounts(userId)).map((account) => ({
				...account,
				grantable: scopes.filter((scope) => platformInfo(account.provider)?.scopes.includes(scope)),
				granted: granted.has(account.id)
			}))
		},
		app: summary
	};
}
function redirectWith(redirectUri, params) {
	const url = new URL(redirectUri);
	for (const [key, value] of Object.entries(params)) if (value !== void 0) url.searchParams.set(key, value);
	return url.toString();
}
/** The person allowed the app: store the grants and hand the app a one-time code. */
async function approve(userId, request) {
	const checked = await consentView(userId, request);
	if (!checked.ok) return checked;
	const view = checked.view;
	const app = await appByClientId(request.clientId);
	const chosen = view.accounts.filter((account) => request.accountIds.includes(account.id) && account.grantable.length > 0);
	if (chosen.length === 0) return {
		ok: false,
		error: "Choose at least one account to share."
	};
	const code = randomToken("code_");
	await tx(async (client) => {
		await rows(`delete from app_grants where user_id = $1 and app_id = $2`, [userId, app.id], client);
		for (const account of chosen) await rows(`insert into app_grants (user_id, app_id, account_id, scopes) values ($1, $2, $3, $4)`, [
			userId,
			app.id,
			account.id,
			account.grantable.join(" ")
		], client);
		await rows(`insert into auth_codes (code_hash, user_id, app_id, redirect_uri, expires_at) values ($1, $2, $3, $4, now() + make_interval(mins => $5))`, [
			sha256(code),
			userId,
			app.id,
			request.redirectUri,
			CODE_MINUTES
		], client);
	});
	await logActivity(userId, "App authorized", `${app.name} may use ${chosen.map((a) => `${platformLabel(a.provider)} ${a.handle} (${a.grantable.join(", ")})`).join("; ")}`);
	return {
		ok: true,
		redirect: redirectWith(request.redirectUri, {
			code,
			state: request.state
		})
	};
}
async function deny(request) {
	const checked = await consentView(null, request);
	if (!checked.ok) return checked;
	return {
		ok: true,
		redirect: redirectWith(request.redirectUri, {
			error: "access_denied",
			state: request.state
		})
	};
}
var ApiError = class extends Error {
	status;
	code;
	constructor(status, code, message) {
		super(message);
		this.status = status;
		this.code = code;
	}
};
/** Client credentials from HTTP Basic auth or the request body. */
async function authenticateClient(request, body) {
	let clientId = body.client_id;
	let clientSecret = body.client_secret;
	const header = request.headers.get("authorization") ?? "";
	if (header.toLowerCase().startsWith("basic ")) {
		const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
		const split = decoded.indexOf(":");
		clientId = decodeURIComponent(decoded.slice(0, split));
		clientSecret = decodeURIComponent(decoded.slice(split + 1));
	}
	const app = clientId ? await appByClientId(clientId) : void 0;
	if (!app || !clientSecret || !hashesEqual(app.client_secret_hash, sha256(clientSecret))) throw new ApiError(401, "invalid_client", "Unknown client or wrong client secret.");
	return app;
}
async function readBody(request) {
	if ((request.headers.get("content-type") ?? "").includes("application/json")) {
		const json = await request.json().catch(() => null);
		return Object.fromEntries(Object.entries(json ?? {}).map(([key, value]) => [key, String(value ?? "")]));
	}
	return Object.fromEntries(new URLSearchParams(await request.text()));
}
async function grantedAccounts(userId, appId) {
	return (await rows(`select a.id, a.provider, a.account_id, a.handle, a.display_name, a.avatar_url, g.scopes
     from app_grants g join accounts a on a.id = g.account_id
     where g.user_id = $1 and g.app_id = $2 order by a.provider, a.display_name`, [userId, appId])).map((row) => ({
		id: row.id,
		platform: row.provider,
		platform_account_id: row.account_id,
		handle: row.handle,
		display_name: row.display_name,
		avatar_url: row.avatar_url,
		scopes: parseScopes(row.scopes)
	}));
}
async function identityPayload(userId, appId) {
	const user = await one(`select id, display_name, avatar_url from users where id = $1`, [userId]);
	return {
		user: {
			id: user.id,
			display_name: user.display_name,
			avatar_url: user.avatar_url
		},
		accounts: await grantedAccounts(userId, appId)
	};
}
/** POST /api/v1/oauth/token: trade a one-time code for an app access token. */
async function exchangeCode(request) {
	const body = await readBody(request);
	const app = await authenticateClient(request, body);
	if ((body.grant_type ?? "authorization_code") !== "authorization_code") throw new ApiError(400, "unsupported_grant_type", "Only authorization_code is supported.");
	const used = await one(`update auth_codes set used_at = now() where code_hash = $1 and app_id = $2 and used_at is null
     returning user_id, redirect_uri, expires_at`, [sha256(body.code ?? ""), app.id]);
	if (!used || used.expires_at.getTime() < Date.now() || used.redirect_uri !== body.redirect_uri) throw new ApiError(400, "invalid_grant", "The code is unknown, used, expired, or redirect_uri does not match.");
	const token = randomToken("ihub_at_");
	await rows(`insert into app_tokens (token_hash, user_id, app_id) values ($1, $2, $3)`, [
		sha256(token),
		used.user_id,
		app.id
	]);
	return {
		access_token: token,
		token_type: "Bearer",
		...await identityPayload(used.user_id, app.id)
	};
}
/** Resolve the `Authorization: Bearer ihub_at_...` header to the user and app it belongs to. */
async function authenticateToken(request) {
	const header = request.headers.get("authorization") ?? "";
	const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
	const row = token ? await one(`update app_tokens set last_used_at = now() where token_hash = $1 returning user_id, app_id`, [sha256(token)]) : void 0;
	if (!row) throw new ApiError(401, "invalid_token", "Missing, unknown or revoked access token.");
	return {
		userId: row.user_id,
		appId: row.app_id
	};
}
/** GET /api/v1/me: the person and the accounts they granted this app. */
async function me(request) {
	const { userId, appId } = await authenticateToken(request);
	return identityPayload(userId, appId);
}
/**
* POST /api/v1/accounts/{id}/token: a usable platform access token for an
* account granted with `publish`, refreshed first when it is about to expire.
*/
async function accountToken(request, accountId) {
	const { userId, appId } = await authenticateToken(request);
	return tx(async (client) => {
		const row = await one(`select a.provider, a.account_id, a.access_token, a.refresh_token, a.token_expires_at, g.scopes
       from app_grants g join accounts a on a.id = g.account_id
       where g.user_id = $1 and g.app_id = $2 and g.account_id = $3 for update of a`, [
			userId,
			appId,
			accountId
		], client);
		if (!row) throw new ApiError(404, "not_found", "That account is not granted to this app.");
		if (!parseScopes(row.scopes).includes("publish")) throw new ApiError(403, "insufficient_scope", "The person did not grant publish access to this account.");
		let accessToken = decryptSecret(row.access_token);
		let expiresAt = row.token_expires_at;
		if (expiresAt && expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS) {
			const p = platform(row.provider);
			const creds = p ? credentials(p) : null;
			if (!p?.refresh || !creds) throw new ApiError(409, "reconnect_required", "The token expired and cannot be refreshed. Ask the person to reconnect.");
			try {
				const next = await p.refresh({
					creds,
					tokens: {
						accountId: row.account_id,
						accessToken,
						refreshToken: row.refresh_token ? decryptSecret(row.refresh_token) : null
					}
				});
				accessToken = next.accessToken;
				expiresAt = next.expiresAt;
				await rows(`update accounts set access_token = $2, refresh_token = coalesce($3, refresh_token), token_expires_at = $4 where id = $1`, [
					accountId,
					encryptSecret(next.accessToken),
					encryptOptional(next.refreshToken),
					next.expiresAt
				], client);
			} catch (error) {
				throw new ApiError(409, "reconnect_required", error instanceof Error ? error.message : "Refresh failed; reconnect the account.");
			}
		}
		return {
			access_token: accessToken,
			expires_at: expiresAt ? expiresAt.toISOString() : null,
			platform: row.provider,
			platform_account_id: row.account_id
		};
	});
}
/** POST /api/v1/oauth/revoke: the app gives up a token (RFC 7009: always 200). */
async function revokeToken(request) {
	const body = await readBody(request);
	const app = await authenticateClient(request, body);
	await rows(`delete from app_tokens where token_hash = $1 and app_id = $2`, [sha256(body.token ?? ""), app.id]);
	return {};
}
//#endregion
export { ApiError, accountToken, approve, consentView, deny, exchangeCode, me, revokeToken };
