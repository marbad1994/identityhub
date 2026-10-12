import { c as oauthProvider, l as providerCredentials, n as PLAN_LIMITS, o as getSql, r as STRIPE_PRICES, s as missingCredentialNames, u as providerScopes } from "./providers-BmON5_LI.mjs";
import { a as providerById, i as normalizeHandle, o as validOrigin, r as initialWidget } from "./hub-Bm3YMrkJ.mjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/hub.server-Dct6fiIS.js
function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}
function hashesEqual(left, right) {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	if (a.length !== b.length) return false;
	return timingSafeEqual(a, b);
}
function randomToken(prefix) {
	return `${prefix}${randomBytes(24).toString("base64url")}`;
}
function pkcePair() {
	const verifier = randomBytes(32).toString("base64url");
	return {
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url")
	};
}
function encryptionKey() {
	const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
	if (!raw) return null;
	return createHash("sha256").update(raw).digest();
}
function encryptionReady() {
	return encryptionKey() !== null;
}
function encryptSecret(plain) {
	const key = encryptionKey();
	if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("base64url")}.${tag.toString("base64url")}.${body.toString("base64url")}`;
}
function decryptSecret(payload) {
	const key = encryptionKey();
	if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
	const [ivPart, tagPart, bodyPart] = payload.split(".");
	if (!ivPart || !tagPart || !bodyPart) throw new Error("Stored token is unreadable");
	const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
	decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
	return Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]).toString("utf8");
}
function uid() {
	return crypto.randomUUID();
}
function splitScopes(value) {
	const out = [];
	for (const part of value.split(",")) if (part === "profile" || part === "media" || part === "publish" || part === "analytics") {
		if (!out.includes(part)) out.push(part);
	}
	return out;
}
function joinScopes(scopes) {
	return scopes.join(",");
}
function iso(value) {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string" && value) return value;
	return (/* @__PURE__ */ new Date()).toISOString();
}
function isoOrNull(value) {
	if (value == null) return null;
	return iso(value);
}
function appOrigin(requestUrl) {
	const pinned = process.env.APP_ORIGIN?.trim().replace(/\/$/, "");
	if (pinned) return pinned;
	return new URL(requestUrl).origin;
}
function callbackUrl(origin) {
	return `${origin}/api/oauth/callback`;
}
function readiness() {
	const providers = {};
	for (const id of [
		"x",
		"instagram",
		"facebook",
		"tiktok",
		"linkedin",
		"youtube",
		"reddit"
	]) {
		const provider = oauthProvider(id);
		const missing = provider ? missingCredentialNames(provider) : [id];
		providers[id] = {
			ready: missing.length === 0 && encryptionReady(),
			missing: encryptionReady() ? missing : ["TOKEN_ENCRYPTION_KEY", ...missing]
		};
	}
	return {
		encryption: encryptionReady(),
		appOrigin: Boolean(process.env.APP_ORIGIN?.trim()),
		stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
		webhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim()),
		prices: {
			starter: Boolean(process.env.STRIPE_PRICE_STARTER?.trim()),
			growth: Boolean(process.env.STRIPE_PRICE_GROWTH?.trim()),
			scale: Boolean(process.env.STRIPE_PRICE_SCALE?.trim())
		},
		providers
	};
}
async function audit(sql, userId, action, detail) {
	await sql.query(`insert into audit_events (id, user_id, action, detail) values ($1, $2, $3, $4)`, [
		uid(),
		userId,
		action.slice(0, 80),
		detail.slice(0, 240)
	]);
}
async function ensure(sql, userId) {
	await sql.query(`insert into tenants (user_id, name) values ($1, 'Workspace') on conflict (user_id) do nothing`, [userId]);
	await sql.query(`insert into billing (user_id) values ($1) on conflict (user_id) do nothing`, [userId]);
	if ((await sql.query(`select id from products where user_id = $1 limit 1`, [userId])).length > 0) return;
	const stamp = uid().slice(0, 8);
	const defaults = [[
		`socialpostapi-${stamp}`,
		"SocialPostAPI",
		"https://socialpostapi.makketing.com",
		"Multi-platform social publishing"
	], [
		`makketing-${stamp}`,
		"Makketing",
		"https://makketing.com",
		"Shared platform workspace"
	]];
	for (const [id, name, origin, description] of defaults) {
		const secret = randomToken("ihub_sk_");
		await sql.query(`insert into products (id, user_id, name, origin, description, client_id, client_secret_hash, reveal_secret)
       values ($1, $2, $3, $4, $5, $6, $7, $8) on conflict (id) do nothing`, [
			id,
			userId,
			name,
			origin,
			description,
			randomToken("ihub_pk_"),
			sha256(secret),
			secret
		]);
	}
}
async function loadHub(sql, userId) {
	const tenant = (await sql.query(`select widget_name, widget_theme, widget_providers from tenants where user_id = $1`, [userId]))[0];
	const widget = initialWidget();
	if (tenant) {
		if (tenant.widget_name.trim()) widget.name = tenant.widget_name.slice(0, 40);
		if (tenant.widget_theme === "dark" || tenant.widget_theme === "light") widget.theme = tenant.widget_theme;
		const providers = tenant.widget_providers.split(",").filter((id) => Boolean(providerById(id)));
		if (providers.length > 0) widget.providers = providers;
	}
	const connections = await sql.query(`select id, provider, handle, display_name, scopes, mode, status, connected_at
     from connections where user_id = $1 order by connected_at desc`, [userId]);
	const products = await sql.query(`select id, name, origin, description, client_id, reveal_secret, created_at from products where user_id = $1 order by created_at asc`, [userId]);
	const grants = await sql.query(`select id, product_id, connection_id, scopes, granted_at from grants where user_id = $1 order by granted_at desc`, [userId]);
	const events = await sql.query(`select id, action, detail, created_at from audit_events where user_id = $1 order by created_at desc limit 200`, [userId]);
	const billingRow = (await sql.query(`select plan, status, current_period_end from billing where user_id = $1`, [userId]))[0];
	const plan = billingRow?.plan ?? "sandbox";
	const liveProfiles = connections.filter((row) => row.mode === "live").length;
	const stripeOn = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
	const active = billingRow?.status === "active" || billingRow?.status === "trialing";
	const profileLimit = !stripeOn ? 5 : active ? PLAN_LIMITS[plan] ?? 0 : 0;
	const billing = {
		plan: active ? plan : "sandbox",
		status: billingRow?.status ?? "inactive",
		profileLimit,
		liveProfiles,
		currentPeriodEnd: isoOrNull(billingRow?.current_period_end)
	};
	return {
		connections: connections.flatMap((row) => {
			const provider = providerById(row.provider);
			if (!provider) return [];
			return [{
				id: row.id,
				provider: provider.id,
				handle: row.handle,
				displayName: row.display_name,
				scopes: splitScopes(row.scopes),
				mode: row.mode === "live" ? "live" : "sandbox",
				status: row.status,
				connectedAt: iso(row.connected_at)
			}];
		}),
		products: products.map((row) => ({
			id: row.id,
			name: row.name,
			origin: row.origin,
			description: row.description,
			clientId: row.client_id,
			createdAt: iso(row.created_at),
			...row.reveal_secret ? { revealSecret: row.reveal_secret } : {}
		})),
		grants: grants.map((row) => ({
			id: row.id,
			productId: row.product_id,
			connectionId: row.connection_id,
			scopes: splitScopes(row.scopes),
			grantedAt: iso(row.granted_at)
		})),
		events: events.map((row) => ({
			id: row.id,
			at: iso(row.created_at),
			action: row.action,
			detail: row.detail
		})),
		widget,
		billing,
		readiness: readiness()
	};
}
async function snapshot(userId) {
	const sql = await getSql();
	await ensure(sql, userId);
	return loadHub(sql, userId);
}
async function getHub(userId) {
	return snapshot(userId);
}
function cleanRequested(providerId, scopes) {
	const provider = providerById(providerId);
	if (!provider) return [];
	const allow = new Set(provider.scopes);
	const out = [];
	for (const scope of scopes) if ((scope === "profile" || scope === "media" || scope === "publish" || scope === "analytics") && allow.has(scope)) {
		if (!out.includes(scope)) out.push(scope);
	}
	return out;
}
async function connectSandbox(userId, input) {
	const provider = providerById(input.provider);
	if (!provider) return {
		ok: false,
		error: "That platform is not available."
	};
	const handle = normalizeHandle(input.handle);
	if (!handle) return {
		ok: false,
		error: "Use a handle like @studio — letters, numbers, dots, and underscores."
	};
	const displayName = input.displayName.trim().slice(0, 60);
	if (displayName.length < 2) return {
		ok: false,
		error: "Add a display name."
	};
	const scopes = cleanRequested(provider.id, input.scopes);
	if (scopes.length === 0) return {
		ok: false,
		error: "Choose at least one scope this account allows."
	};
	const sql = await getSql();
	await ensure(sql, userId);
	if ((await sql.query(`select id from connections where user_id = $1 and provider = $2 and lower(handle) = lower($3)`, [
		userId,
		provider.id,
		handle
	])).length > 0) return {
		ok: false,
		error: `${handle} is already connected on ${provider.name}.`
	};
	if (((await sql.query(`select count(*)::int as n from connections where user_id = $1`, [userId]))[0]?.n ?? 0) >= 40) return {
		ok: false,
		error: "This workspace already has the maximum number of connections."
	};
	await sql.query(`insert into connections (id, user_id, provider, handle, display_name, scopes, mode, status)
     values ($1, $2, $3, $4, $5, $6, 'sandbox', 'connected')`, [
		uid(),
		userId,
		provider.id,
		handle,
		displayName,
		joinScopes(scopes)
	]);
	await audit(sql, userId, "Connected", `Sandbox profile ${handle} on ${provider.name}. No provider was contacted.`);
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function disconnectAccount(userId, connectionId) {
	const sql = await getSql();
	await ensure(sql, userId);
	const row = (await sql.query(`select handle, provider, mode, refresh_token from connections where id = $1 and user_id = $2`, [connectionId, userId]))[0];
	if (!row) return {
		ok: false,
		error: "That connection is no longer in this workspace."
	};
	if (row.mode === "live" && row.refresh_token) try {
		const refresh = decryptSecret(row.refresh_token);
		await revokeProvider(row.provider, refresh);
	} catch {}
	const removed = await sql.query(`select count(*)::int as n from grants where connection_id = $1 and user_id = $2`, [connectionId, userId]);
	await sql.query(`delete from grants where connection_id = $1 and user_id = $2`, [connectionId, userId]);
	await sql.query(`delete from exchange_codes where connection_id = $1 and user_id = $2`, [connectionId, userId]);
	await sql.query(`delete from product_tokens where connection_id = $1 and user_id = $2`, [connectionId, userId]);
	await sql.query(`delete from connections where id = $1 and user_id = $2`, [connectionId, userId]);
	const n = removed[0]?.n ?? 0;
	await audit(sql, userId, "Disconnected", `${row.handle} on ${providerById(row.provider)?.name ?? row.provider} removed, along with ${n} grant${n === 1 ? "" : "s"}.`);
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function revokeProvider(providerId, refreshToken) {
	const provider = oauthProvider(providerId);
	const creds = provider ? providerCredentials(provider) : null;
	if (!provider || !creds || !refreshToken) return;
	if (provider.id === "youtube") await fetch("https://oauth2.googleapis.com/revoke", {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({ token: refreshToken })
	});
}
async function addProduct(userId, input) {
	const name = input.name.trim().slice(0, 48);
	if (name.length < 2) return {
		ok: false,
		error: "Name the app in at least two characters."
	};
	const origin = input.origin.trim();
	if (!validOrigin(origin)) return {
		ok: false,
		error: "Use an https origin only, like https://example.com — no path, query, or login."
	};
	const sql = await getSql();
	await ensure(sql, userId);
	if (((await sql.query(`select count(*)::int as n from products where user_id = $1`, [userId]))[0]?.n ?? 0) >= 24) return {
		ok: false,
		error: "This workspace already has the maximum number of apps."
	};
	if ((await sql.query(`select id from products where user_id = $1 and origin = $2`, [userId, origin])).length > 0) return {
		ok: false,
		error: "An app with that origin is already registered."
	};
	const secret = randomToken("ihub_sk_");
	const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "app"}-${uid().slice(0, 8)}`;
	await sql.query(`insert into products (id, user_id, name, origin, description, client_id, client_secret_hash, reveal_secret)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`, [
		id,
		userId,
		name,
		origin,
		input.description.trim().slice(0, 140),
		randomToken("ihub_pk_"),
		sha256(secret),
		secret
	]);
	await audit(sql, userId, "App registered", `${name} · ${origin}. The client secret is shown once.`);
	return {
		ok: true,
		hub: await loadHub(sql, userId),
		secret
	};
}
async function dismissProductSecret(userId, productId) {
	const sql = await getSql();
	await sql.query(`update products set reveal_secret = null where id = $1 and user_id = $2`, [productId, userId]);
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function deleteProduct(userId, productId) {
	const sql = await getSql();
	await ensure(sql, userId);
	const product = (await sql.query(`select name from products where id = $1 and user_id = $2`, [productId, userId]))[0];
	if (!product) return {
		ok: false,
		error: "That app is no longer registered."
	};
	const removed = await sql.query(`select count(*)::int as n from grants where product_id = $1 and user_id = $2`, [productId, userId]);
	await sql.query(`delete from grants where product_id = $1 and user_id = $2`, [productId, userId]);
	await sql.query(`delete from exchange_codes where product_id = $1 and user_id = $2`, [productId, userId]);
	await sql.query(`delete from product_tokens where product_id = $1 and user_id = $2`, [productId, userId]);
	await sql.query(`delete from products where id = $1 and user_id = $2`, [productId, userId]);
	const n = removed[0]?.n ?? 0;
	await audit(sql, userId, "App removed", `${product.name} removed, along with ${n} grant${n === 1 ? "" : "s"}.`);
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function setGrant(userId, input) {
	const sql = await getSql();
	await ensure(sql, userId);
	const products = await sql.query(`select id, name from products where id = $1 and user_id = $2`, [input.productId, userId]);
	const connections = await sql.query(`select id, handle, scopes, provider from connections where id = $1 and user_id = $2`, [input.connectionId, userId]);
	const product = products[0];
	const connection = connections[0];
	if (!product) return {
		ok: false,
		error: "Register the app before granting access."
	};
	if (!connection) return {
		ok: false,
		error: "Connect the account before granting access."
	};
	const allowed = new Set(splitScopes(connection.scopes));
	const scopes = cleanRequested(connection.provider, input.scopes).filter((scope) => allowed.has(scope));
	const existing = await sql.query(`select id, scopes from grants where product_id = $1 and connection_id = $2 and user_id = $3`, [
		product.id,
		connection.id,
		userId
	]);
	if (scopes.length === 0) {
		if (!existing[0]) return {
			ok: true,
			hub: await loadHub(sql, userId)
		};
		await sql.query(`delete from grants where id = $1 and user_id = $2`, [existing[0].id, userId]);
		await audit(sql, userId, "Grant revoked", `${product.name} can no longer use ${connection.handle}.`);
		return {
			ok: true,
			hub: await loadHub(sql, userId)
		};
	}
	if (existing[0] && existing[0].scopes === joinScopes(scopes)) return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
	if (existing[0]) {
		await sql.query(`update grants set scopes = $1, granted_at = now() where id = $2 and user_id = $3`, [
			joinScopes(scopes),
			existing[0].id,
			userId
		]);
		await audit(sql, userId, "Grant updated", `${product.name} may use ${scopes.join(", ")} on ${connection.handle}.`);
	} else {
		await sql.query(`insert into grants (id, user_id, product_id, connection_id, scopes) values ($1, $2, $3, $4, $5)`, [
			uid(),
			userId,
			product.id,
			connection.id,
			joinScopes(scopes)
		]);
		await audit(sql, userId, "Grant added", `${product.name} may use ${scopes.join(", ")} on ${connection.handle}.`);
	}
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function updateWidget(userId, input) {
	const name = input.name.trim().slice(0, 40);
	if (name.length < 2) return {
		ok: false,
		error: "Give the widget an app name."
	};
	if (input.theme !== "light" && input.theme !== "dark") return {
		ok: false,
		error: "Choose a light or dark widget theme."
	};
	const providers = input.providers.filter((id) => Boolean(providerById(id)));
	if (providers.length === 0) return {
		ok: false,
		error: "Show at least one platform in the widget."
	};
	const sql = await getSql();
	await ensure(sql, userId);
	await sql.query(`update tenants set widget_name = $1, widget_theme = $2, widget_providers = $3 where user_id = $4`, [
		name,
		input.theme,
		providers.join(","),
		userId
	]);
	await audit(sql, userId, "Widget updated", `${name} · ${input.theme} · ${providers.length} platforms.`);
	return {
		ok: true,
		hub: await loadHub(sql, userId)
	};
}
async function seedSample(userId) {
	const samples = [
		{
			provider: "x",
			handle: "@northwind",
			displayName: "Northwind",
			scopes: ["profile", "publish"]
		},
		{
			provider: "instagram",
			handle: "@northwind.studio",
			displayName: "Northwind Studio",
			scopes: [
				"profile",
				"media",
				"publish"
			]
		},
		{
			provider: "linkedin",
			handle: "@northwind",
			displayName: "Northwind",
			scopes: ["profile", "publish"]
		}
	];
	for (const sample of samples) {
		const created = await connectSandbox(userId, sample);
		if (!created.ok && !created.error.includes("already connected")) return created;
	}
	const sql = await getSql();
	const productId = (await sql.query(`select id from products where user_id = $1 and name = 'SocialPostAPI' order by created_at asc limit 1`, [userId]))[0]?.id;
	if (!productId) return {
		ok: true,
		hub: await snapshot(userId)
	};
	for (const sample of samples) {
		const connectionId = (await sql.query(`select id from connections where user_id = $1 and provider = $2 and lower(handle) = lower($3)`, [
			userId,
			sample.provider,
			sample.handle
		]))[0]?.id;
		if (!connectionId) continue;
		await setGrant(userId, {
			productId,
			connectionId,
			scopes: sample.scopes
		});
	}
	return {
		ok: true,
		hub: await snapshot(userId)
	};
}
async function resetWorkspace(userId) {
	const sql = await getSql();
	await sql.query(`delete from product_tokens where user_id = $1`, [userId]);
	await sql.query(`delete from exchange_codes where user_id = $1`, [userId]);
	await sql.query(`delete from grants where user_id = $1`, [userId]);
	await sql.query(`delete from connections where user_id = $1`, [userId]);
	await sql.query(`delete from products where user_id = $1`, [userId]);
	await sql.query(`delete from oauth_transactions where user_id = $1`, [userId]);
	await sql.query(`delete from audit_events where user_id = $1`, [userId]);
	await sql.query(`delete from tenants where user_id = $1`, [userId]);
	return snapshot(userId);
}
async function deleteWorkspace(userId) {
	const sql = await getSql();
	await sql.query(`delete from product_tokens where user_id = $1`, [userId]);
	await sql.query(`delete from exchange_codes where user_id = $1`, [userId]);
	await sql.query(`delete from grants where user_id = $1`, [userId]);
	await sql.query(`delete from connections where user_id = $1`, [userId]);
	await sql.query(`delete from products where user_id = $1`, [userId]);
	await sql.query(`delete from oauth_transactions where user_id = $1`, [userId]);
	await sql.query(`delete from audit_events where user_id = $1`, [userId]);
	await sql.query(`delete from billing where user_id = $1`, [userId]);
	await sql.query(`delete from tenants where user_id = $1`, [userId]);
}
function liveLimit(billing) {
	return billing.profileLimit;
}
async function beginOAuth(userId, input, origin) {
	const provider = oauthProvider(input.provider);
	if (!provider) return {
		ok: false,
		error: "That platform is not available."
	};
	if (!encryptionReady()) return {
		ok: false,
		error: "Set TOKEN_ENCRYPTION_KEY before connecting a live account."
	};
	const creds = providerCredentials(provider);
	if (!creds) return {
		ok: false,
		error: `Add ${missingCredentialNames(provider).join(", ")} to connect ${provider.label}.`
	};
	const scopes = cleanRequested(provider.id, input.scopes);
	if (scopes.length === 0) return {
		ok: false,
		error: "Choose at least one scope."
	};
	const sql = await getSql();
	await ensure(sql, userId);
	const hub = await loadHub(sql, userId);
	if (hub.billing.liveProfiles >= liveLimit(hub.billing)) return {
		ok: false,
		error: process.env.STRIPE_SECRET_KEY ? "Live profiles need an active plan. Open Pricing and subscribe, or disconnect a live account." : "The sandbox live cap is 5 profiles until Stripe is configured."
	};
	const { verifier, challenge } = pkcePair();
	const state = randomToken("st_");
	const remoteScopes = providerScopes(provider, scopes);
	await sql.query(`delete from oauth_transactions where user_id = $1 and expires_at < now()`, [userId]);
	await sql.query(`insert into oauth_transactions (state, user_id, provider, verifier, scopes, expires_at)
     values ($1, $2, $3, $4, $5, now() + interval '15 minutes')`, [
		state,
		userId,
		provider.id,
		verifier,
		joinScopes(scopes)
	]);
	const url = new URL(provider.authorize);
	url.searchParams.set(provider.clientKeyName, creds.clientId);
	url.searchParams.set("redirect_uri", callbackUrl(origin));
	url.searchParams.set("response_type", "code");
	url.searchParams.set("state", state);
	url.searchParams.set("scope", remoteScopes.join(provider.id === "reddit" ? " " : " "));
	if (provider.pkce) {
		url.searchParams.set("code_challenge", challenge);
		url.searchParams.set("code_challenge_method", "S256");
	}
	for (const [key, value] of Object.entries(provider.extraAuth)) url.searchParams.set(key, value);
	return {
		ok: true,
		hub,
		authorizeUrl: url.toString()
	};
}
async function tokenRequest(provider, body, creds) {
	const headers = {
		"content-type": "application/x-www-form-urlencoded",
		accept: "application/json"
	};
	if (provider.basicAuth) headers.authorization = `Basic ${Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64")}`;
	else {
		body.set(provider.clientKeyName, creds.clientId);
		body.set("client_secret", creds.clientSecret);
	}
	if (provider.id === "reddit") headers["user-agent"] = "identityhub/1.0 (by /u/makketing)";
	const response = await fetch(provider.token, {
		method: "POST",
		headers,
		body
	});
	const json = await response.json().catch(() => ({}));
	if (!response.ok) {
		const message = typeof json.error_description === "string" ? json.error_description : typeof json.error === "string" ? json.error : "Token exchange failed";
		throw new Error(message);
	}
	return json;
}
async function profileFor(provider, accessToken) {
	const headers = {
		authorization: `Bearer ${accessToken}`,
		accept: "application/json"
	};
	if (provider.id === "x") {
		const json = await (await fetch("https://api.twitter.com/2/users/me?user.fields=username,name", { headers })).json();
		const username = json.data?.username;
		if (!username) throw new Error("X did not return a username");
		return {
			handle: `@${username}`,
			displayName: json.data?.name || username
		};
	}
	if (provider.id === "facebook") {
		const json = await (await fetch("https://graph.facebook.com/v21.0/me?fields=id,name", { headers })).json();
		if (!json.id) throw new Error("Facebook did not return a profile");
		return {
			handle: `@${json.id}`,
			displayName: json.name || "Facebook account"
		};
	}
	if (provider.id === "instagram") {
		const json = await (await fetch("https://graph.instagram.com/me?fields=user_id,username,name", { headers })).json();
		const username = json.username || json.user_id;
		if (!username) throw new Error("Instagram did not return a username");
		return {
			handle: `@${username}`,
			displayName: json.name || username
		};
	}
	if (provider.id === "linkedin") {
		const json = await (await fetch("https://api.linkedin.com/v2/userinfo", { headers })).json();
		if (!json.sub && !json.name) throw new Error("LinkedIn did not return a profile");
		return {
			handle: `@${(json.email || json.sub || "linkedin").split("@")[0]}`,
			displayName: json.name || "LinkedIn account"
		};
	}
	if (provider.id === "youtube") {
		const json = await (await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers })).json();
		if (!json.email && !json.name) throw new Error("Google did not return a profile");
		const handle = `@${(json.email || "youtube").split("@")[0]}`;
		return {
			handle,
			displayName: json.name || handle
		};
	}
	if (provider.id === "tiktok") {
		const user = (await (await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username", {
			method: "POST",
			headers: {
				...headers,
				"content-type": "application/json"
			}
		})).json()).data?.user;
		const username = user?.username || user?.open_id;
		if (!username) throw new Error("TikTok did not return a profile");
		return {
			handle: `@${username}`,
			displayName: user?.display_name || username
		};
	}
	const json = await (await fetch("https://oauth.reddit.com/api/v1/me", { headers: {
		...headers,
		"user-agent": "identityhub/1.0 (by /u/makketing)"
	} })).json();
	if (!json.name) throw new Error("Reddit did not return a username");
	return {
		handle: `@${json.name}`,
		displayName: json.name
	};
}
async function finishOAuth(requestUrl) {
	const url = new URL(requestUrl);
	const origin = appOrigin(requestUrl);
	const fail = (message) => `${origin}/workspace?error=${encodeURIComponent(message)}`;
	const providerError = url.searchParams.get("error_description") || url.searchParams.get("error");
	if (providerError && !url.searchParams.get("code")) return fail(providerError);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	if (!code || !state) return fail("The provider did not return a code.");
	const sql = await getSql();
	const pending = (await sql.query(`select user_id, provider, verifier, scopes, expires_at from oauth_transactions where state = $1`, [state]))[0];
	await sql.query(`delete from oauth_transactions where state = $1`, [state]);
	if (!pending) return fail("That connection attempt expired. Start it again.");
	if (new Date(iso(pending.expires_at)).getTime() < Date.now()) return fail("That connection attempt expired. Start it again.");
	const provider = oauthProvider(pending.provider);
	const creds = provider ? providerCredentials(provider) : null;
	if (!provider || !creds) return fail("Provider keys are no longer configured.");
	try {
		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: callbackUrl(origin)
		});
		if (provider.pkce) body.set("code_verifier", pending.verifier);
		const token = await tokenRequest(provider, body, creds);
		const access = typeof token.access_token === "string" ? token.access_token : "";
		if (!access) throw new Error("Provider did not return an access token");
		const refresh = typeof token.refresh_token === "string" ? token.refresh_token : "";
		const expiresIn = typeof token.expires_in === "number" ? token.expires_in : Number(token.expires_in || 0);
		const profile = await profileFor(provider, access);
		const handle = normalizeHandle(profile.handle) ?? profile.handle.slice(0, 40);
		const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1e3).toISOString() : null;
		await sql.query(`insert into connections (id, user_id, provider, handle, display_name, scopes, mode, status, access_token, refresh_token, token_expires_at)
       values ($1, $2, $3, $4, $5, $6, 'live', 'connected', $7, $8, $9)
       on conflict (user_id, provider, handle) do update set
         display_name = excluded.display_name,
         scopes = excluded.scopes,
         mode = 'live',
         status = 'connected',
         access_token = excluded.access_token,
         refresh_token = coalesce(excluded.refresh_token, connections.refresh_token),
         token_expires_at = excluded.token_expires_at,
         connected_at = now()`, [
			uid(),
			pending.user_id,
			provider.id,
			handle,
			profile.displayName.slice(0, 60),
			pending.scopes,
			encryptSecret(access),
			refresh ? encryptSecret(refresh) : null,
			expiresAt
		]);
		await audit(sql, pending.user_id, "Connected", `Live profile ${handle} on ${provider.label}.`);
		return `${origin}/workspace?connected=${encodeURIComponent(provider.label)}`;
	} catch (error) {
		const message = error instanceof Error ? error.message : "The provider rejected the connection.";
		await audit(sql, pending.user_id, "Connect failed", message);
		return fail(message);
	}
}
async function publicProduct(clientId) {
	const row = (await (await getSql()).query(`select name, origin, client_id from products where client_id = $1`, [clientId]))[0];
	if (!row) return null;
	return {
		name: row.name,
		origin: row.origin,
		clientId: row.client_id
	};
}
async function issueCode(userId, input) {
	const sql = await getSql();
	const product = (await sql.query(`select id, origin, name, user_id from products where client_id = $1 and user_id = $2`, [input.clientId, userId]))[0];
	if (!product) return {
		ok: false,
		error: "That app is not registered on this workspace."
	};
	let redirect;
	try {
		redirect = new URL(input.redirectUri || product.origin);
	} catch {
		return {
			ok: false,
			error: "Redirect URL is not valid."
		};
	}
	if (redirect.origin !== product.origin || redirect.username || redirect.password || redirect.search || redirect.hash) return {
		ok: false,
		error: "Redirect URL must be the app's registered https origin."
	};
	const connection = (await sql.query(`select id, scopes, provider from connections where id = $1 and user_id = $2`, [input.connectionId, userId]))[0];
	if (!connection) return {
		ok: false,
		error: "Choose a connected account."
	};
	const allowed = new Set(splitScopes(connection.scopes));
	const scopes = cleanRequested(connection.provider, input.scopes).filter((scope) => allowed.has(scope));
	if (scopes.length === 0) return {
		ok: false,
		error: "Choose at least one allowed scope."
	};
	await setGrant(userId, {
		productId: product.id,
		connectionId: connection.id,
		scopes
	});
	const code = randomToken("code_");
	await sql.query(`insert into exchange_codes (id, user_id, product_id, connection_id, code_hash, scopes, expires_at)
     values ($1, $2, $3, $4, $5, $6, now() + interval '10 minutes')`, [
		uid(),
		userId,
		product.id,
		connection.id,
		sha256(code),
		joinScopes(scopes)
	]);
	redirect.searchParams.set("code", code);
	await audit(sql, userId, "Code issued", `${product.name} received a one-time code for ${connection.provider}.`);
	return {
		ok: true,
		redirect: redirect.toString()
	};
}
async function exchangeCode(input) {
	const sql = await getSql();
	const product = (await sql.query(`select id, user_id, client_secret_hash, name from products where client_id = $1`, [input.clientId]))[0];
	if (!product || !hashesEqual(product.client_secret_hash, sha256(input.clientSecret))) return { error: "invalid_client" };
	const code = (await sql.query(`select id, connection_id, scopes, expires_at, used_at, user_id from exchange_codes where code_hash = $1 and product_id = $2`, [sha256(input.code), product.id]))[0];
	if (!code || code.used_at || new Date(iso(code.expires_at)).getTime() < Date.now() || code.user_id !== product.user_id) return { error: "invalid_grant" };
	await sql.query(`update exchange_codes set used_at = now() where id = $1`, [code.id]);
	const connection = (await sql.query(`select provider, handle, display_name from connections where id = $1 and user_id = $2`, [code.connection_id, product.user_id]))[0];
	if (!connection) return { error: "invalid_grant" };
	const access = randomToken("ihub_at_");
	await sql.query(`insert into product_tokens (token_hash, user_id, product_id, connection_id, scopes, expires_at)
     values ($1, $2, $3, $4, $5, now() + interval '1 hour')`, [
		sha256(access),
		product.user_id,
		product.id,
		code.connection_id,
		code.scopes
	]);
	await audit(sql, product.user_id, "Token issued", `${product.name} exchanged a code. Provider tokens stayed on the hub.`);
	return {
		access_token: access,
		token_type: "Bearer",
		expires_in: 3600,
		scope: code.scopes.replaceAll(",", " "),
		connection: {
			provider: connection.provider,
			handle: connection.handle,
			display_name: connection.display_name
		}
	};
}
async function introspect(authorization) {
	const token = authorization?.replace(/^Bearer\s+/i, "").trim() ?? "";
	if (!token) return { active: false };
	const sql = await getSql();
	const row = (await sql.query(`select scopes, expires_at, connection_id, user_id, product_id from product_tokens where token_hash = $1`, [sha256(token)]))[0];
	if (!row || new Date(iso(row.expires_at)).getTime() < Date.now()) return { active: false };
	const connection = (await sql.query(`select provider, handle, display_name, mode from connections where id = $1 and user_id = $2`, [row.connection_id, row.user_id]))[0];
	if (!connection) return { active: false };
	return {
		active: true,
		scope: row.scopes.replaceAll(",", " "),
		connection: {
			provider: connection.provider,
			handle: connection.handle,
			display_name: connection.display_name,
			mode: connection.mode
		}
	};
}
async function startCheckout(userId, plan, origin) {
	const secret = process.env.STRIPE_SECRET_KEY?.trim();
	const price = process.env[STRIPE_PRICES[plan]]?.trim();
	if (!secret || !price) return {
		ok: false,
		error: `Set STRIPE_SECRET_KEY and ${STRIPE_PRICES[plan]}.`
	};
	const Stripe = (await import("../_libs/stripe.mjs").then((n) => n.t)).default;
	const stripe = new Stripe(secret);
	const sql = await getSql();
	await ensure(sql, userId);
	let customer = (await sql.query(`select stripe_customer_id from billing where user_id = $1`, [userId]))[0]?.stripe_customer_id ?? void 0;
	if (!customer) {
		customer = (await stripe.customers.create({ metadata: { userId } })).id;
		await sql.query(`update billing set stripe_customer_id = $1 where user_id = $2`, [customer, userId]);
	}
	const session = await stripe.checkout.sessions.create({
		mode: "subscription",
		customer,
		line_items: [{
			price,
			quantity: 1
		}],
		success_url: `${origin}/workspace?billing=success`,
		cancel_url: `${origin}/pricing?billing=cancel`,
		client_reference_id: userId,
		metadata: {
			userId,
			plan
		},
		subscription_data: { metadata: {
			userId,
			plan
		} }
	});
	if (!session.url) return {
		ok: false,
		error: "Stripe did not return a checkout URL."
	};
	return {
		ok: true,
		url: session.url
	};
}
async function applyStripeEvent(raw, signature) {
	const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
	const key = process.env.STRIPE_SECRET_KEY?.trim();
	if (!secret || !key) return new Response("Stripe is not configured", { status: 503 });
	if (!signature) return new Response("Missing signature", { status: 400 });
	const Stripe = (await import("../_libs/stripe.mjs").then((n) => n.t)).default;
	const stripe = new Stripe(key);
	let event;
	try {
		event = stripe.webhooks.constructEvent(raw, signature, secret);
	} catch {
		return new Response("Invalid signature", { status: 400 });
	}
	const sql = await getSql();
	if (event.type === "checkout.session.completed") {
		const session = event.data.object;
		const userId = session.metadata?.userId || session.client_reference_id;
		const plan = session.metadata?.plan;
		if (userId && (plan === "starter" || plan === "growth" || plan === "scale")) await sql.query(`insert into billing (user_id, stripe_customer_id, stripe_subscription_id, plan, status)
         values ($1, $2, $3, $4, 'active')
         on conflict (user_id) do update set
           stripe_customer_id = excluded.stripe_customer_id,
           stripe_subscription_id = excluded.stripe_subscription_id,
           plan = excluded.plan,
           status = 'active'`, [
			userId,
			typeof session.customer === "string" ? session.customer : null,
			typeof session.subscription === "string" ? session.subscription : null,
			plan
		]);
	}
	if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
		const subscription = event.data.object;
		const userId = subscription.metadata?.userId;
		const plan = subscription.metadata?.plan;
		if (userId) {
			const status = subscription.status === "canceled" || event.type === "customer.subscription.deleted" ? "canceled" : subscription.status;
			const end = subscription.current_period_end ? (/* @__PURE__ */ new Date(subscription.current_period_end * 1e3)).toISOString() : null;
			await sql.query(`update billing set status = $1, plan = coalesce($2, plan), current_period_end = $3, stripe_subscription_id = $4 where user_id = $5`, [
				status,
				plan ?? null,
				end,
				subscription.id,
				userId
			]);
		}
	}
	return new Response("ok");
}
//#endregion
export { addProduct, appOrigin, applyStripeEvent, beginOAuth, connectSandbox, deleteProduct, deleteWorkspace, disconnectAccount, dismissProductSecret, exchangeCode, finishOAuth, getHub, introspect, issueCode, publicProduct, resetWorkspace, seedSample, setGrant, startCheckout, updateWidget };
