import { a as platformLabel } from "./platforms-BdWV-H2d.mjs";
import { a as rows, i as one, s as tx, t as appOrigin } from "./db-9EsWRqP0.mjs";
import { a as pkcePair, c as uid, n as encryptOptional, o as randomToken, r as encryptSecret } from "./crypto-B4IhR8Z6.mjs";
import { a as platform, i as logActivity, n as credentials, t as callbackUrl } from "./activity-92JLjaS9.mjs";
import { createSession } from "./session-BNEWO7BQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/oauth-BTqAPEjj.js
var STATE_MINUTES = 10;
/** Only same-site relative paths may be returned to after a platform round trip. */
function safeReturnTo(value, fallback) {
	if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
	return value;
}
function withError(path, message) {
	const url = new URL(path, appOrigin());
	url.searchParams.set("error", message);
	return `${url.pathname}${url.search}`;
}
/** Start a platform authorization. `user` is required to connect, and absent to sign in. */
async function beginAuthorization(input) {
	const p = platform(input.provider);
	const fallback = input.intent === "connect" ? "/workspace" : "/login";
	if (!p) return { location: withError(fallback, "That platform is not supported.") };
	const creds = credentials(p);
	if (!creds) return { location: withError(fallback, `${platformLabel(p.id)} is not configured on this hub yet.`) };
	if (input.intent === "connect" && !input.user) return { location: "/login" };
	const { verifier, challenge } = pkcePair();
	const state = randomToken("st_");
	await rows(`delete from oauth_states where expires_at < now()`);
	await rows(`insert into oauth_states (state, intent, user_id, provider, verifier, return_to, expires_at)
     values ($1, $2, $3, $4, $5, $6, now() + make_interval(mins => $7))`, [
		state,
		input.intent,
		input.user?.id ?? null,
		p.id,
		verifier,
		input.returnTo,
		STATE_MINUTES
	]);
	return { location: p.authorizeUrl({
		creds,
		redirectUri: callbackUrl(p.id),
		state,
		challenge
	}) };
}
async function upsertAccounts(client, userId, provider, login) {
	for (const account of login.accounts) await rows(`insert into accounts (id, user_id, provider, account_id, handle, display_name, avatar_url,
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
         connected_at = now()`, [
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
		account.platformScopes
	], client);
}
/** Resolve the hub user for a platform identity, creating one on first sign-in. */
async function userForLogin(client, provider, login) {
	const existing = await one(`select user_id from user_logins where provider = $1 and subject = $2`, [provider, login.subject.id], client);
	if (existing) {
		await rows(`update users set display_name = $2, avatar_url = coalesce($3, avatar_url) where id = $1`, [
			existing.user_id,
			login.subject.displayName.slice(0, 120),
			login.subject.avatarUrl
		], client);
		return existing.user_id;
	}
	const userId = uid();
	await rows(`insert into users (id, display_name, avatar_url) values ($1, $2, $3)`, [
		userId,
		login.subject.displayName.slice(0, 120),
		login.subject.avatarUrl
	], client);
	await rows(`insert into user_logins (provider, subject, user_id) values ($1, $2, $3)`, [
		provider,
		login.subject.id,
		userId
	], client);
	return userId;
}
/** Handle the platform's redirect back to `/api/auth/callback/<provider>`. */
async function finishAuthorization(provider, requestUrl) {
	const url = new URL(requestUrl);
	const state = url.searchParams.get("state") ?? "";
	const pending = await one(`delete from oauth_states where state = $1 and expires_at > now() returning intent, user_id, provider, verifier, return_to`, [state]);
	if (!pending || pending.provider !== provider) return { location: withError("/login", "That sign-in attempt expired or was already used. Start again.") };
	const fallback = pending.intent === "connect" ? "/workspace" : "/login";
	const p = platform(provider);
	const creds = p ? credentials(p) : null;
	if (!p || !creds) return { location: withError(fallback, "This platform is no longer configured.") };
	const code = url.searchParams.get("code");
	if (!code) return { location: withError(fallback, url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "The platform did not return a code.") };
	let login;
	try {
		login = await p.exchange({
			creds,
			code,
			redirectUri: callbackUrl(p.id),
			verifier: pending.verifier
		});
	} catch (error) {
		return { location: withError(fallback, error instanceof Error ? error.message : "The platform rejected the sign-in.") };
	}
	if (pending.intent === "connect" && login.accounts.length === 0) return { location: withError(fallback, `No ${platformLabel(p.id)} accounts were shared. Facebook needs at least one Page you manage.`) };
	const label = platformLabel(p.id);
	return tx(async (client) => {
		if (pending.intent === "connect" && pending.user_id) {
			await upsertAccounts(client, pending.user_id, p.id, login);
			await rows(`insert into user_logins (provider, subject, user_id) values ($1, $2, $3) on conflict do nothing`, [
				p.id,
				login.subject.id,
				pending.user_id
			], client);
			await logActivity(pending.user_id, "Connected", `${login.accounts.length} ${label} account(s): ${login.accounts.map((a) => a.handle).join(", ")}`, client);
			return { location: safeReturnTo(pending.return_to, "/workspace") };
		}
		const userId = await userForLogin(client, p.id, login);
		await upsertAccounts(client, userId, p.id, login);
		await logActivity(userId, "Signed in", `With ${label} as ${login.subject.displayName}`, client);
		const setCookie = await createSession(userId, client);
		return {
			location: safeReturnTo(pending.return_to, "/workspace"),
			setCookie
		};
	});
}
//#endregion
export { beginAuthorization, finishAuthorization, safeReturnTo };
