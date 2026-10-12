import { a as rows, r as env, t as appOrigin } from "./db-9EsWRqP0.mjs";
import { c as uid } from "./crypto-B4IhR8Z6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/activity-92JLjaS9.js
var USER_AGENT = "IdentityHub/1.0 (by Makketing)";
var PlatformError = class extends Error {};
/** Fetch and parse JSON, turning a platform error body into a readable message. Never logs bodies: they carry tokens. */
async function requestJson(platform, url, init = {}) {
	const response = await fetch(url, init);
	const text = await response.text();
	let body = {};
	try {
		body = text ? JSON.parse(text) : {};
	} catch {
		body = { raw: text.slice(0, 300) };
	}
	if (!response.ok) {
		const nested = typeof body.error === "object" && body.error ? body.error.message : void 0;
		const message = body.error_description ?? body.message ?? nested ?? body.error ?? body.raw ?? `HTTP ${response.status}`;
		throw new PlatformError(`${platform} rejected the request: ${String(message)}`);
	}
	return body;
}
function form(values) {
	return new URLSearchParams(values);
}
function basicAuth(clientId, clientSecret) {
	return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}
function bearer(token) {
	return {
		authorization: `Bearer ${token}`,
		accept: "application/json"
	};
}
function expiresAt(expiresIn) {
	const seconds = Number(expiresIn);
	return Number.isFinite(seconds) && seconds > 0 ? new Date(Date.now() + seconds * 1e3) : null;
}
function withQuery(base, params) {
	const url = new URL(base);
	for (const [key, value] of Object.entries(params)) if (value !== void 0) url.searchParams.set(key, value);
	return url.toString();
}
var AUTHORIZE_URL$7 = "https://www.facebook.com/v21.0/dialog/oauth";
var TOKEN_URL$7 = "https://graph.facebook.com/v21.0/oauth/access_token";
var API = "https://graph.facebook.com/v21.0";
var SCOPES$7 = [
	"public_profile",
	"pages_show_list",
	"pages_read_engagement",
	"pages_manage_posts",
	"pages_manage_metadata"
];
/**
* Signing in identifies the Facebook user; the accounts it unlocks are the
* Pages that user manages, one per Page, each with its own Page token.
*/
var facebook = {
	id: "facebook",
	envPrefix: "FACEBOOK",
	pkce: false,
	authorizeUrl: ({ creds, redirectUri, state }) => {
		const configId = env("FACEBOOK_LOGIN_CONFIG_ID");
		return withQuery(AUTHORIZE_URL$7, {
			client_id: creds.clientId,
			redirect_uri: redirectUri,
			response_type: "code",
			state,
			...configId ? { config_id: configId } : { scope: SCOPES$7.join(",") },
			auth_type: "rerequest"
		});
	},
	async exchange({ creds, code, redirectUri }) {
		const short = await requestJson("Facebook", withQuery(TOKEN_URL$7, {
			client_id: creds.clientId,
			client_secret: creds.clientSecret,
			redirect_uri: redirectUri,
			code
		}));
		const long = await requestJson("Facebook", withQuery(TOKEN_URL$7, {
			grant_type: "fb_exchange_token",
			client_id: creds.clientId,
			client_secret: creds.clientSecret,
			fb_exchange_token: short.access_token
		}));
		const userToken = long.access_token;
		const me = await requestJson("Facebook", withQuery(`${API}/me`, {
			fields: "id,name,picture",
			access_token: userToken
		}));
		const pages = await requestJson("Facebook", withQuery(`${API}/me/accounts`, {
			fields: "id,name,access_token,picture",
			access_token: userToken
		}));
		return {
			subject: {
				id: String(me.id),
				displayName: me.name ?? String(me.id),
				avatarUrl: me.picture?.data?.url ?? null
			},
			accounts: (pages.data ?? []).map((page) => ({
				accountId: String(page.id),
				handle: page.name ?? String(page.id),
				displayName: page.name ?? String(page.id),
				avatarUrl: page.picture?.data?.url ?? null,
				accessToken: page.access_token,
				refreshToken: userToken,
				expiresAt: expiresAt(long.expires_in),
				platformScopes: SCOPES$7.join(",")
			}))
		};
	},
	async refresh({ tokens }) {
		if (!tokens.refreshToken) throw new Error("Reconnect the Facebook Page");
		const page = ((await requestJson("Facebook", withQuery(`${API}/me/accounts`, {
			fields: "id,access_token",
			access_token: tokens.refreshToken
		}))).data ?? []).find((item) => String(item.id) === tokens.accountId);
		if (!page) throw new Error("The Page is no longer accessible; reconnect Facebook");
		return {
			accessToken: page.access_token,
			expiresAt: null
		};
	}
};
var AUTHORIZE_URL$6 = "https://www.instagram.com/oauth/authorize";
var TOKEN_URL$6 = "https://api.instagram.com/oauth/access_token";
var LONG_LIVED_URL = "https://graph.instagram.com/access_token";
var REFRESH_URL = "https://graph.instagram.com/refresh_access_token";
var ME_URL$4 = "https://graph.instagram.com/v21.0/me";
var SCOPES$6 = ["instagram_business_basic", "instagram_business_content_publish"];
var instagram = {
	id: "instagram",
	envPrefix: "INSTAGRAM",
	pkce: false,
	authorizeUrl: ({ creds, redirectUri, state }) => withQuery(AUTHORIZE_URL$6, {
		client_id: creds.clientId,
		redirect_uri: redirectUri,
		scope: SCOPES$6.join(","),
		response_type: "code",
		state
	}),
	async exchange({ creds, code, redirectUri }) {
		const body = new FormData();
		body.set("client_id", creds.clientId);
		body.set("client_secret", creds.clientSecret);
		body.set("grant_type", "authorization_code");
		body.set("redirect_uri", redirectUri);
		body.set("code", code);
		const short = await requestJson("Instagram", TOKEN_URL$6, {
			method: "POST",
			body
		});
		const long = await requestJson("Instagram", withQuery(LONG_LIVED_URL, {
			grant_type: "ig_exchange_token",
			client_secret: creds.clientSecret,
			access_token: short.access_token
		}));
		const accessToken = long.access_token ?? short.access_token;
		const me = await requestJson("Instagram", withQuery(ME_URL$4, {
			fields: "id,username,profile_picture_url",
			access_token: accessToken
		}));
		const id = String(me.id ?? short.user_id);
		const handle = me.username ?? id;
		return {
			subject: {
				id,
				displayName: handle,
				avatarUrl: me.profile_picture_url ?? null
			},
			accounts: [{
				accountId: id,
				handle: `@${handle}`,
				displayName: handle,
				avatarUrl: me.profile_picture_url ?? null,
				accessToken,
				refreshToken: null,
				expiresAt: expiresAt(long.expires_in),
				platformScopes: SCOPES$6.join(",")
			}]
		};
	},
	async refresh({ tokens }) {
		const next = await requestJson("Instagram", withQuery(REFRESH_URL, {
			grant_type: "ig_refresh_token",
			access_token: tokens.accessToken
		}));
		return {
			accessToken: next.access_token,
			expiresAt: expiresAt(next.expires_in)
		};
	}
};
var AUTHORIZE_URL$5 = "https://www.linkedin.com/oauth/v2/authorization";
var TOKEN_URL$5 = "https://www.linkedin.com/oauth/v2/accessToken";
var USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
var SCOPES$5 = [
	"openid",
	"profile",
	"w_member_social"
];
var linkedin = {
	id: "linkedin",
	envPrefix: "LINKEDIN",
	pkce: false,
	authorizeUrl: ({ creds, redirectUri, state }) => withQuery(AUTHORIZE_URL$5, {
		response_type: "code",
		client_id: creds.clientId,
		redirect_uri: redirectUri,
		state,
		scope: SCOPES$5.join(" ")
	}),
	async exchange({ creds, code, redirectUri }) {
		const tokens = await requestJson("LinkedIn", TOKEN_URL$5, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
				client_id: creds.clientId,
				client_secret: creds.clientSecret
			})
		});
		const user = await requestJson("LinkedIn", USERINFO_URL, { headers: bearer(tokens.access_token) });
		const id = String(user.sub);
		const name = user.name ?? id;
		return {
			subject: {
				id,
				displayName: name,
				avatarUrl: user.picture ?? null
			},
			accounts: [{
				accountId: id,
				handle: name,
				displayName: name,
				avatarUrl: user.picture ?? null,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token ?? null,
				expiresAt: expiresAt(tokens.expires_in),
				platformScopes: tokens.scope ?? SCOPES$5.join(" ")
			}]
		};
	},
	async refresh({ creds, tokens }) {
		if (!tokens.refreshToken) throw new Error("LinkedIn access expired; reconnect the account");
		const next = await requestJson("LinkedIn", TOKEN_URL$5, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				grant_type: "refresh_token",
				refresh_token: tokens.refreshToken,
				client_id: creds.clientId,
				client_secret: creds.clientSecret
			})
		});
		return {
			accessToken: next.access_token,
			refreshToken: next.refresh_token ?? tokens.refreshToken,
			expiresAt: expiresAt(next.expires_in)
		};
	}
};
var AUTHORIZE_URL$4 = "https://www.reddit.com/api/v1/authorize";
var TOKEN_URL$4 = "https://www.reddit.com/api/v1/access_token";
var ME_URL$3 = "https://oauth.reddit.com/api/v1/me";
var SCOPES$4 = [
	"identity",
	"submit",
	"read",
	"edit",
	"privatemessages"
];
var reddit = {
	id: "reddit",
	envPrefix: "REDDIT",
	pkce: false,
	authorizeUrl: ({ creds, redirectUri, state }) => withQuery(AUTHORIZE_URL$4, {
		client_id: creds.clientId,
		response_type: "code",
		state,
		redirect_uri: redirectUri,
		duration: "permanent",
		scope: SCOPES$4.join(" ")
	}),
	async exchange({ creds, code, redirectUri }) {
		const tokens = await requestJson("Reddit", TOKEN_URL$4, {
			method: "POST",
			headers: {
				authorization: basicAuth(creds.clientId, creds.clientSecret),
				"content-type": "application/x-www-form-urlencoded",
				"user-agent": USER_AGENT
			},
			body: form({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri
			})
		});
		const user = await requestJson("Reddit", ME_URL$3, { headers: {
			authorization: `Bearer ${tokens.access_token}`,
			"user-agent": USER_AGENT
		} });
		const id = String(user.id);
		const name = user.name ?? id;
		const avatar = typeof user.icon_img === "string" && user.icon_img ? user.icon_img.split("?")[0] : null;
		return {
			subject: {
				id,
				displayName: name,
				avatarUrl: avatar
			},
			accounts: [{
				accountId: id,
				handle: `u/${name}`,
				displayName: name,
				avatarUrl: avatar,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token ?? null,
				expiresAt: expiresAt(tokens.expires_in),
				platformScopes: tokens.scope ?? SCOPES$4.join(" ")
			}]
		};
	},
	async refresh({ creds, tokens }) {
		if (!tokens.refreshToken) throw new Error("Reconnect the Reddit account");
		const next = await requestJson("Reddit", TOKEN_URL$4, {
			method: "POST",
			headers: {
				authorization: basicAuth(creds.clientId, creds.clientSecret),
				"content-type": "application/x-www-form-urlencoded",
				"user-agent": USER_AGENT
			},
			body: form({
				grant_type: "refresh_token",
				refresh_token: tokens.refreshToken
			})
		});
		return {
			accessToken: next.access_token,
			expiresAt: expiresAt(next.expires_in)
		};
	}
};
var AUTHORIZE_URL$3 = "https://accounts.snapchat.com/accounts/oauth2/auth";
var TOKEN_URL$3 = "https://accounts.snapchat.com/accounts/oauth2/token";
var ME_URL$2 = "https://kit.snapchat.com/v1/me";
var SCOPES$3 = [
	"https://auth.snapchat.com/oauth2/api/user.external_id",
	"https://auth.snapchat.com/oauth2/api/user.display_name",
	"https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar"
];
/**
* Snap Login Kit: identity only. Snapchat has no API for posting on a
* person's behalf, so a Snapchat connection only ever carries `profile`.
*/
var snapchat = {
	id: "snapchat",
	envPrefix: "SNAPCHAT",
	pkce: true,
	authorizeUrl: ({ creds, redirectUri, state, challenge }) => withQuery(AUTHORIZE_URL$3, {
		client_id: creds.clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: SCOPES$3.join(" "),
		state,
		code_challenge: challenge,
		code_challenge_method: "S256"
	}),
	async exchange({ creds, code, redirectUri, verifier }) {
		const tokens = await requestJson("Snapchat", TOKEN_URL$3, {
			method: "POST",
			headers: {
				authorization: basicAuth(creds.clientId, creds.clientSecret),
				"content-type": "application/x-www-form-urlencoded"
			},
			body: form({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
				code_verifier: verifier
			})
		});
		const user = (await requestJson("Snapchat", withQuery(ME_URL$2, { query: "{me{externalId displayName bitmoji{avatar}}}" }), { headers: bearer(tokens.access_token) })).data?.me ?? {};
		const id = String(user.externalId);
		const name = user.displayName ?? "Snapchat user";
		const avatar = user.bitmoji?.avatar ?? null;
		return {
			subject: {
				id,
				displayName: name,
				avatarUrl: avatar
			},
			accounts: [{
				accountId: id,
				handle: name,
				displayName: name,
				avatarUrl: avatar,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token ?? null,
				expiresAt: expiresAt(tokens.expires_in),
				platformScopes: SCOPES$3.join(" ")
			}]
		};
	}
};
var AUTHORIZE_URL$2 = "https://www.tiktok.com/v2/auth/authorize/";
var TOKEN_URL$2 = "https://open.tiktokapis.com/v2/oauth/token/";
var ME_URL$1 = "https://open.tiktokapis.com/v2/user/info/";
var SCOPES$2 = [
	"user.info.basic",
	"video.publish",
	"video.upload"
];
function assertOk(tokens) {
	if (tokens.error && tokens.error !== "ok") throw new PlatformError(`TikTok rejected the request: ${tokens.error_description ?? tokens.error}`);
}
var tiktok = {
	id: "tiktok",
	envPrefix: "TIKTOK",
	pkce: true,
	authorizeUrl: ({ creds, redirectUri, state, challenge }) => withQuery(AUTHORIZE_URL$2, {
		client_key: creds.clientId,
		scope: SCOPES$2.join(","),
		response_type: "code",
		redirect_uri: redirectUri,
		state,
		code_challenge: challenge,
		code_challenge_method: "S256"
	}),
	async exchange({ creds, code, redirectUri, verifier }) {
		const tokens = await requestJson("TikTok", TOKEN_URL$2, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				client_key: creds.clientId,
				client_secret: creds.clientSecret,
				code,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
				code_verifier: verifier
			})
		});
		assertOk(tokens);
		const user = (await requestJson("TikTok", withQuery(ME_URL$1, { fields: "open_id,display_name,avatar_url" }), { headers: bearer(tokens.access_token) })).data?.user ?? {};
		const id = String(user.open_id ?? tokens.open_id);
		const name = user.display_name ?? id;
		return {
			subject: {
				id,
				displayName: name,
				avatarUrl: user.avatar_url ?? null
			},
			accounts: [{
				accountId: id,
				handle: name,
				displayName: name,
				avatarUrl: user.avatar_url ?? null,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token ?? null,
				expiresAt: expiresAt(tokens.expires_in),
				platformScopes: tokens.scope ?? SCOPES$2.join(",")
			}]
		};
	},
	async refresh({ creds, tokens }) {
		if (!tokens.refreshToken) throw new Error("Reconnect the TikTok account");
		const next = await requestJson("TikTok", TOKEN_URL$2, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				client_key: creds.clientId,
				client_secret: creds.clientSecret,
				grant_type: "refresh_token",
				refresh_token: tokens.refreshToken
			})
		});
		assertOk(next);
		return {
			accessToken: next.access_token,
			refreshToken: next.refresh_token ?? tokens.refreshToken,
			expiresAt: expiresAt(next.expires_in)
		};
	}
};
var AUTHORIZE_URL$1 = "https://twitter.com/i/oauth2/authorize";
var TOKEN_URL$1 = "https://api.twitter.com/2/oauth2/token";
var ME_URL = "https://api.twitter.com/2/users/me";
var SCOPES$1 = [
	"tweet.read",
	"tweet.write",
	"users.read",
	"offline.access",
	"media.write"
];
var twitter = {
	id: "twitter",
	envPrefix: "TWITTER",
	pkce: true,
	authorizeUrl: ({ creds, redirectUri, state, challenge }) => withQuery(AUTHORIZE_URL$1, {
		response_type: "code",
		client_id: creds.clientId,
		redirect_uri: redirectUri,
		scope: SCOPES$1.join(" "),
		state,
		code_challenge: challenge,
		code_challenge_method: "S256"
	}),
	async exchange({ creds, code, redirectUri, verifier }) {
		const tokens = await requestJson("X", TOKEN_URL$1, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				grant_type: "authorization_code",
				code,
				redirect_uri: redirectUri,
				client_id: creds.clientId,
				code_verifier: verifier
			})
		});
		const user = (await requestJson("X", withQuery(ME_URL, { "user.fields": "profile_image_url" }), { headers: bearer(tokens.access_token) })).data ?? {};
		const id = String(user.id);
		const subject = {
			id,
			displayName: user.name ?? user.username ?? id,
			avatarUrl: user.profile_image_url ?? null
		};
		return {
			subject,
			accounts: [{
				accountId: id,
				handle: `@${user.username ?? id}`,
				displayName: subject.displayName,
				avatarUrl: subject.avatarUrl,
				accessToken: tokens.access_token,
				refreshToken: tokens.refresh_token ?? null,
				expiresAt: expiresAt(tokens.expires_in),
				platformScopes: tokens.scope ?? SCOPES$1.join(" ")
			}]
		};
	},
	async refresh({ creds, tokens }) {
		if (!tokens.refreshToken) throw new Error("X did not issue a refresh token; reconnect the account");
		const next = await requestJson("X", TOKEN_URL$1, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form({
				grant_type: "refresh_token",
				refresh_token: tokens.refreshToken,
				client_id: creds.clientId
			})
		});
		return {
			accessToken: next.access_token,
			refreshToken: next.refresh_token ?? tokens.refreshToken,
			expiresAt: expiresAt(next.expires_in)
		};
	}
};
var AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
var SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
var REGISTRY = {
	twitter,
	instagram,
	facebook,
	tiktok,
	linkedin,
	youtube: {
		id: "youtube",
		envPrefix: "YOUTUBE",
		pkce: true,
		authorizeUrl: ({ creds, redirectUri, state, challenge }) => withQuery(AUTHORIZE_URL, {
			response_type: "code",
			client_id: creds.clientId,
			redirect_uri: redirectUri,
			scope: SCOPES.join(" "),
			state,
			code_challenge: challenge,
			code_challenge_method: "S256",
			access_type: "offline",
			prompt: "consent"
		}),
		async exchange({ creds, code, redirectUri, verifier }) {
			const tokens = await requestJson("YouTube", TOKEN_URL, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: form({
					grant_type: "authorization_code",
					code,
					redirect_uri: redirectUri,
					client_id: creds.clientId,
					client_secret: creds.clientSecret,
					code_verifier: verifier
				})
			});
			const channel = (await requestJson("YouTube", withQuery(CHANNELS_URL, {
				part: "snippet",
				mine: "true"
			}), { headers: bearer(tokens.access_token) })).items?.[0];
			if (!channel) throw new PlatformError("This Google account has no YouTube channel");
			const title = channel.snippet?.title ?? String(channel.id);
			const avatar = channel.snippet?.thumbnails?.default?.url ?? null;
			return {
				subject: {
					id: String(channel.id),
					displayName: title,
					avatarUrl: avatar
				},
				accounts: [{
					accountId: String(channel.id),
					handle: channel.snippet?.customUrl ?? title,
					displayName: title,
					avatarUrl: avatar,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token ?? null,
					expiresAt: expiresAt(tokens.expires_in),
					platformScopes: tokens.scope ?? SCOPES.join(" ")
				}]
			};
		},
		async refresh({ creds, tokens }) {
			if (!tokens.refreshToken) throw new Error("Reconnect the YouTube channel");
			const next = await requestJson("YouTube", TOKEN_URL, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: form({
					grant_type: "refresh_token",
					refresh_token: tokens.refreshToken,
					client_id: creds.clientId,
					client_secret: creds.clientSecret
				})
			});
			return {
				accessToken: next.access_token,
				expiresAt: expiresAt(next.expires_in)
			};
		}
	},
	reddit,
	snapchat
};
function platform(id) {
	return Object.hasOwn(REGISTRY, id) ? REGISTRY[id] : void 0;
}
function credentialNames(p) {
	return [`${p.envPrefix}_CLIENT_ID`, `${p.envPrefix}_CLIENT_SECRET`];
}
function credentials(p) {
	const [idName, secretName] = credentialNames(p);
	const clientId = env(idName);
	const clientSecret = env(secretName);
	return clientId && clientSecret ? {
		clientId,
		clientSecret
	} : null;
}
/** Ids of the platforms with credentials configured on this host. */
function enabledPlatforms() {
	return Object.keys(REGISTRY).filter((id) => credentials(REGISTRY[id]) !== null);
}
/** The one callback URL to register with each platform. */
function callbackUrl(id) {
	return `${appOrigin()}/api/auth/callback/${id}`;
}
async function logActivity(userId, action, detail, client) {
	await rows(`insert into activity (id, user_id, action, detail) values ($1, $2, $3, $4)`, [
		uid(),
		userId,
		action.slice(0, 80),
		detail.slice(0, 300)
	], client);
}
//#endregion
export { platform as a, logActivity as i, credentials as n, enabledPlatforms as r, callbackUrl as t };
