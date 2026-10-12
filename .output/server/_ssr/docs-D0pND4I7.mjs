import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Page } from "./shell-kuJDO8_1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/docs-D0pND4I7.js
var import_jsx_runtime = require_jsx_runtime();
function Code({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
		className: "mt-3 overflow-x-auto whitespace-pre rounded-2xl bg-ink p-4 font-sans text-sm leading-relaxed text-on-ink",
		children
	});
}
function Step({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-2xl font-semibold tracking-tight",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-2 space-y-3 text-muted",
			children
		})]
	});
}
function Docs() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-4xl font-semibold tracking-tight",
				children: "Integrate an app"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "Identity Hub is an OAuth 2.0 authorization server. People sign in with a social platform, and your app receives their identity plus the accounts they chose to share. Platform tokens stay on the hub; your server asks for one only when it needs to publish."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
				title: "1. Register the app",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Sign in, open the workspace and register the app with its homepage and exact redirect URIs. Copy the client secret when it is shown; it is stored only as a hash." })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Step, {
				title: "2. Send the person to the hub",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"Redirect the browser to ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "/authorize" }),
						". Use a fresh random state and check it when they come back. Scope is",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: " profile" }),
						", ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "publish" }),
						" or both, space separated."
					] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `GET {HUB}/authorize
  ?client_id=ihub_pk_...
  &redirect_uri=https://socialpostapi.makketing.com/auth/identityhub/callback
  &scope=profile publish
  &state=RANDOM` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"They sign in (if needed), pick accounts and allow. The hub redirects to your redirect URI with",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: " code" }),
						" and ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "state" }),
						", or with ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "error=access_denied" }),
						"."
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Step, {
				title: "3. Exchange the code on your server",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Codes are single use and expire after ten minutes. Client credentials go in the body or HTTP Basic auth." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `POST {HUB}/api/v1/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=code_...&redirect_uri=...
&client_id=ihub_pk_...&client_secret=ihub_sk_...` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `{
  "access_token": "ihub_at_...",
  "token_type": "Bearer",
  "user": { "id": "...", "display_name": "...", "avatar_url": "..." },
  "accounts": [
    { "id": "...", "platform": "twitter", "platform_account_id": "...",
      "handle": "@studio", "display_name": "Studio", "avatar_url": "...",
      "scopes": ["profile", "publish"] }
  ]
}` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"The access token does not expire. Store it server side; it stops working when the person removes your app or you revoke it. Use ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "user.id" }),
						" as the stable id for your own user record."
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Step, {
				title: "4. Read the current grant",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `GET {HUB}/api/v1/me
Authorization: Bearer ihub_at_...` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Same user and accounts shape as the token response. Accounts the person disconnected or un-shared are gone." })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Step, {
				title: "5. Get a platform token to publish",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "For an account granted with publish, the hub returns a current platform access token, refreshing it first when it is about to expire. Call it right before each platform request instead of storing the result." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `POST {HUB}/api/v1/accounts/{account id}/token
Authorization: Bearer ihub_at_...

{ "access_token": "...", "expires_at": "2026-10-12T14:00:00.000Z",
  "platform": "facebook", "platform_account_id": "1234" }` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "403 insufficient_scope means publish was not granted. 409 reconnect_required means the platform refused a refresh; ask the person to reconnect the account in Identity Hub." })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
				title: "6. Revoke",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Code, { children: `POST {HUB}/api/v1/oauth/revoke
token=ihub_at_...&client_id=ihub_pk_...&client_secret=ihub_sk_...` })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
				title: "Errors",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
					"Errors are JSON: ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: `{ "error": "invalid_client", "error_description": "..." }` }),
					". Codes: invalid_client (401), invalid_grant (400), unsupported_grant_type (400), invalid_token (401), insufficient_scope (403), not_found (404), reconnect_required (409)."
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Step, {
				title: "Platforms",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "X, Instagram, Facebook (one account per Page), TikTok, LinkedIn, YouTube and Reddit support profile and publish. Snapchat is sign-in only: Snap offers no API for posting, so its accounts only ever carry profile." })
			})
		]
	});
}
//#endregion
export { Docs as component };
