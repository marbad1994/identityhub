import { a as rows, i as one, o as secureCookies } from "./db-9EsWRqP0.mjs";
import { o as randomToken, s as sha256 } from "./crypto-B4IhR8Z6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/session-BNEWO7BQ.js
var SESSION_COOKIE = "ihub_session";
var SESSION_DAYS = 30;
function readCookie(header, name) {
	for (const part of (header ?? "").split(";")) {
		const [key, ...value] = part.trim().split("=");
		if (key === name) return decodeURIComponent(value.join("="));
	}
	return null;
}
function cookie(value, maxAgeSeconds) {
	return [
		`${SESSION_COOKIE}=${value}`,
		"Path=/",
		"HttpOnly",
		"SameSite=Lax",
		`Max-Age=${maxAgeSeconds}`,
		...secureCookies() ? ["Secure"] : []
	].join("; ");
}
/** Start a session and return its Set-Cookie header value. */
async function createSession(userId, client) {
	const token = randomToken("ihs_");
	await rows(`insert into sessions (token_hash, user_id, expires_at) values ($1, $2, now() + make_interval(days => $3))`, [
		sha256(token),
		userId,
		SESSION_DAYS
	], client);
	return cookie(token, SESSION_DAYS * 86400);
}
async function sessionUser(request) {
	const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
	if (!token) return null;
	const row = await one(`select u.id, u.display_name, u.avatar_url from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`, [sha256(token)]);
	return row ? {
		id: row.id,
		displayName: row.display_name,
		avatarUrl: row.avatar_url
	} : null;
}
/** End the request's session and return the Set-Cookie header that clears it. */
async function destroySession(request) {
	const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
	if (token) await rows(`delete from sessions where token_hash = $1`, [sha256(token)]);
	return cookie("", 0);
}
//#endregion
export { createSession, destroySession, sessionUser };
