import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { C as require_jsx_runtime, J as redirect, _ as createFileRoute, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, v as createRootRoute, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as createMiddleware, r as createServerFn } from "./ssr.mjs";
import { hn as object, un as array, vn as string } from "../_libs/@better-auth/core+[...].mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
import { n as auth } from "./server-u54FaiYR.mjs";
import { t as TriangleAlert } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-BiarlHQN.js
/** Server functions the pages call. Each resolves the session from the request cookie. */
var requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const { currentUser } = await import("./request-DxP1t9h7.mjs");
	const user = await currentUser();
	if (!user) throw new Error("Sign in first.");
	return next({ context: { user } });
});
var fetchSession = createServerFn({ method: "GET" }).handler(createSsrRpc("257064b4e25d0aa93a825ca48490bfdab778b86b906d43fcbbe4d06d5a293118"));
var fetchWorkspace = createServerFn({ method: "GET" }).middleware([requireUser]).handler(createSsrRpc("2a8642ff144d532eea39b22a825569b4514cd3f40d03805e6f6451c566fd645c"));
var disconnectAccount = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ accountId: string().max(64) })).handler(createSsrRpc("d348a9a7c9457fa85b7d6796516a89859fdd17784a0a24f7e899090d67fb80ce"));
var revokeApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(createSsrRpc("e38f96766856372a48f5b7b950e04d253300fd21687725e7049f6bb8a121379c"));
var appFields = object({
	name: string().max(60),
	homepageUrl: string().max(300),
	redirectUris: array(string().max(300)).max(10)
});
var createApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(appFields).handler(createSsrRpc("f98dfd49da9b1a25d1bf775371d99920c228cc490d1bd4a4db831955700b2611"));
var updateApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(appFields.extend({ appId: string().max(64) })).handler(createSsrRpc("544a6acbfd25d78f759d7a15d35c7f6a227e569bf38dd056565cdef31cf18153"));
var rotateAppSecret = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(createSsrRpc("92458029fa488ab4a24300cab163ac5e13e891f73f0e05231f005daf8ad04113"));
var deleteApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(createSsrRpc("837b2b8a25ee382b2f757a67eca8370d9a6e2515c8e81feefd2e1ddb4355ae2f"));
var deleteMyData = createServerFn({ method: "POST" }).middleware([requireUser]).handler(createSsrRpc("3cf7e22d12c8b72b2ae6d13494c3c428d94718680c903135319f1ec4d4f9aa8e"));
var authorizeRequest = object({
	clientId: string().max(80),
	redirectUri: string().max(500),
	state: string().max(500).optional(),
	scope: string().max(100).optional()
});
var fetchConsent = createServerFn({ method: "GET" }).validator(authorizeRequest).handler(createSsrRpc("ca205951add67ab0b0f8cefea4f8cd3b8f1b9e9f4ae43d5eb2660cfc2143ff42"));
var approveConsent = createServerFn({ method: "POST" }).middleware([requireUser]).validator(authorizeRequest.extend({ accountIds: array(string().max(64)).max(100) })).handler(createSsrRpc("ef5c585b1f25cb25fd416c373a36e9ba1a8ed9a9752c34be80437c3d1e120a67"));
var denyConsent = createServerFn({ method: "POST" }).validator(authorizeRequest).handler(createSsrRpc("0a9b8b723e805885590101164ac6e479e9137b058aade6bd69398e267850b5e4"));
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-BHOTKWwQ.js
var import_jsx_runtime = require_jsx_runtime();
function AppErrorComponent({ error }) {
	const message = error instanceof Error && error.message ? error.message : "An unexpected error occurred. Try reloading the page.";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, {
				className: "size-10 text-danger",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-md break-words text-sm text-muted",
				children: message
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "min-h-11 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-on-ink no-underline",
				children: "Home"
			})
		]
	});
}
var styles_default = "/assets/styles-BqDPz77R.css";
var Route$24 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Identity Hub" },
			{
				name: "description",
				content: "Sign in with any supported social platform, then choose which connected accounts each Makketing app may use."
			},
			{
				name: "theme-color",
				content: "#111111"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			}
		]
	}),
	loader: () => fetchSession(),
	component: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	})
});
var $$splitComponentImporter$10 = () => import("./routes-G9dP5lH3.mjs");
var Route$23 = createFileRoute("/")({
	head: () => ({ meta: [{ title: "Identity Hub · One login for the Makketing suite" }] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./authorize-BxFVqHiB.mjs");
var text = (value) => typeof value === "string" ? value : void 0;
var Route$22 = createFileRoute("/authorize")({
	head: () => ({ meta: [{ title: "Authorize · Identity Hub" }] }),
	validateSearch: (search) => ({
		client_id: text(search.client_id) ?? "",
		redirect_uri: text(search.redirect_uri) ?? "",
		state: text(search.state),
		scope: text(search.scope)
	}),
	loaderDeps: ({ search }) => search,
	loader: ({ deps }) => fetchConsent({ data: {
		clientId: deps.client_id,
		redirectUri: deps.redirect_uri,
		state: deps.state,
		scope: deps.scope
	} }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./connect-cUSOmf7R.mjs");
var Route$21 = createFileRoute("/connect")({
	head: () => ({ meta: [{ title: "Connect · Identity Hub" }] }),
	validateSearch: (search) => ({
		client_id: typeof search.client_id === "string" && search.client_id ? search.client_id : void 0,
		redirect_uri: typeof search.redirect_uri === "string" && search.redirect_uri ? search.redirect_uri : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./deletion-Bu3gNNDP.mjs");
var Route$20 = createFileRoute("/deletion")({
	head: () => ({ meta: [{ title: "Data Deletion · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./demo-CCl6lfs1.mjs");
var Route$19 = createFileRoute("/demo")({
	head: () => ({ meta: [{ title: "Widget demo · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./docs-D0pND4I7.mjs");
var Route$18 = createFileRoute("/docs")({
	head: () => ({ meta: [{ title: "Docs · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./login-DYPgjryx.mjs");
var Route$17 = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Sign in · Identity Hub" }] }),
	validateSearch: (search) => ({
		return_to: typeof search.return_to === "string" ? search.return_to : void 0,
		error: typeof search.error === "string" ? search.error : void 0
	}),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./pricing-CN9Wkp6P.mjs");
var Route$16 = createFileRoute("/pricing")({
	head: () => ({ meta: [{ title: "Pricing · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./privacy-7W4yZLRy.mjs");
var Route$15 = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: "Privacy Policy · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./terms-CB2m0JQY.mjs");
var Route$14 = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: "Terms of Service · Identity Hub" }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./workspace-DgBoenHY.mjs");
var Route$13 = createFileRoute("/workspace")({
	head: () => ({ meta: [{ title: "Workspace · Identity Hub" }] }),
	validateSearch: (search) => ({ error: typeof search.error === "string" ? search.error : void 0 }),
	beforeLoad: async () => {
		if (!(await fetchSession()).user) throw redirect({
			to: "/login",
			search: { return_to: "/workspace" }
		});
	},
	loader: () => fetchWorkspace(),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
/** Run a mutation, refresh the page data, and surface any error. */
var Route$12 = createFileRoute("/api/health")({ server: { handlers: { GET: async () => {
	const { one } = await import("./db-9EsWRqP0.mjs").then((n) => n.n).then((n) => n.t);
	try {
		await one("select 1");
		return Response.json({ status: "ok" });
	} catch {
		return Response.json({ status: "database_unavailable" }, { status: 503 });
	}
} } } });
var Route$11 = createFileRoute("/api/auth/$")({ server: { handlers: {
	GET: ({ request }) => auth.handler(request),
	POST: ({ request }) => auth.handler(request)
} } });
var Route$10 = createFileRoute("/api/auth/logout")({ server: { handlers: { POST: async ({ request }) => {
	const { destroySession } = await import("./session-BNEWO7BQ.mjs");
	const { redirect } = await import("./http-DFBJ3Or7.mjs");
	return redirect("/", await destroySession(request));
} } } });
var Route$9 = createFileRoute("/api/auth/start")({ server: { handlers: { GET: async ({ request }) => {
	const { beginAuthorization, safeReturnTo } = await import("./oauth-BTqAPEjj.mjs");
	const { sessionUser } = await import("./session-BNEWO7BQ.mjs");
	const { redirect } = await import("./http-DFBJ3Or7.mjs");
	const url = new URL(request.url);
	const intent = url.searchParams.get("intent") === "connect" ? "connect" : "login";
	return redirect((await beginAuthorization({
		provider: url.searchParams.get("platform") ?? "",
		intent,
		returnTo: safeReturnTo(url.searchParams.get("return_to"), "/workspace"),
		user: await sessionUser(request)
	})).location);
} } } });
var Route$8 = createFileRoute("/api/oauth/callback")({ server: { handlers: { GET: async ({ request }) => {
	const { finishOAuth } = await import("./hub.server-Dct6fiIS.mjs");
	const location = await finishOAuth(request.url);
	return new Response(null, {
		status: 302,
		headers: { location }
	});
} } } });
var Route$7 = createFileRoute("/api/oauth/introspect")({ server: { handlers: { GET: async ({ request }) => {
	const { introspect } = await import("./hub.server-Dct6fiIS.mjs");
	return Response.json(await introspect(request.headers.get("authorization")));
} } } });
var Route$6 = createFileRoute("/api/oauth/token")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body?.client_id || !body.client_secret || !body.code) return Response.json({ error: "invalid_request" }, { status: 400 });
	const { exchangeCode } = await import("./hub.server-Dct6fiIS.mjs");
	const result = await exchangeCode({
		clientId: body.client_id,
		clientSecret: body.client_secret,
		code: body.code
	});
	if ("error" in result) return Response.json(result, { status: 401 });
	return Response.json(result);
} } } });
var Route$5 = createFileRoute("/api/stripe/webhook")({ server: { handlers: { POST: async ({ request }) => {
	const { applyStripeEvent } = await import("./hub.server-Dct6fiIS.mjs");
	return applyStripeEvent(await request.text(), request.headers.get("stripe-signature"));
} } } });
var Route$4 = createFileRoute("/api/v1/me")({ server: { handlers: { GET: async ({ request }) => {
	const { me } = await import("./apps-B_TU16ag.mjs");
	const { apiResponse } = await import("./http-DFBJ3Or7.mjs");
	return apiResponse(() => me(request));
} } } });
var Route$3 = createFileRoute("/api/auth/callback/$platform")({ server: { handlers: { GET: async ({ request, params }) => {
	const { finishAuthorization } = await import("./oauth-BTqAPEjj.mjs");
	const { redirect } = await import("./http-DFBJ3Or7.mjs");
	const result = await finishAuthorization(params.platform, request.url);
	return redirect(result.location, result.setCookie);
} } } });
var Route$2 = createFileRoute("/api/v1/oauth/revoke")({ server: { handlers: { POST: async ({ request }) => {
	const { revokeToken } = await import("./apps-B_TU16ag.mjs");
	const { apiResponse } = await import("./http-DFBJ3Or7.mjs");
	return apiResponse(() => revokeToken(request));
} } } });
var Route$1 = createFileRoute("/api/v1/oauth/token")({ server: { handlers: { POST: async ({ request }) => {
	const { exchangeCode } = await import("./apps-B_TU16ag.mjs");
	const { apiResponse } = await import("./http-DFBJ3Or7.mjs");
	return apiResponse(() => exchangeCode(request));
} } } });
var Route = createFileRoute("/api/v1/accounts/$accountId/token")({ server: { handlers: { POST: async ({ request, params }) => {
	const { accountToken } = await import("./apps-B_TU16ag.mjs");
	const { apiResponse } = await import("./http-DFBJ3Or7.mjs");
	return apiResponse(() => accountToken(request, params.accountId));
} } } });
var rootRouteChildren = {
	IndexRoute: Route$23.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$24
	}),
	AuthorizeRoute: Route$22.update({
		id: "/authorize",
		path: "/authorize",
		getParentRoute: () => Route$24
	}),
	ConnectRoute: Route$21.update({
		id: "/connect",
		path: "/connect",
		getParentRoute: () => Route$24
	}),
	DeletionRoute: Route$20.update({
		id: "/deletion",
		path: "/deletion",
		getParentRoute: () => Route$24
	}),
	DemoRoute: Route$19.update({
		id: "/demo",
		path: "/demo",
		getParentRoute: () => Route$24
	}),
	DocsRoute: Route$18.update({
		id: "/docs",
		path: "/docs",
		getParentRoute: () => Route$24
	}),
	LoginRoute: Route$17.update({
		id: "/login",
		path: "/login",
		getParentRoute: () => Route$24
	}),
	PricingRoute: Route$16.update({
		id: "/pricing",
		path: "/pricing",
		getParentRoute: () => Route$24
	}),
	PrivacyRoute: Route$15.update({
		id: "/privacy",
		path: "/privacy",
		getParentRoute: () => Route$24
	}),
	TermsRoute: Route$14.update({
		id: "/terms",
		path: "/terms",
		getParentRoute: () => Route$24
	}),
	WorkspaceRoute: Route$13.update({
		id: "/workspace",
		path: "/workspace",
		getParentRoute: () => Route$24
	}),
	ApiHealthRoute: Route$12.update({
		id: "/api/health",
		path: "/api/health",
		getParentRoute: () => Route$24
	}),
	ApiAuthSplatRoute: Route$11.update({
		id: "/api/auth/$",
		path: "/api/auth/$",
		getParentRoute: () => Route$24
	}),
	ApiAuthLogoutRoute: Route$10.update({
		id: "/api/auth/logout",
		path: "/api/auth/logout",
		getParentRoute: () => Route$24
	}),
	ApiAuthStartRoute: Route$9.update({
		id: "/api/auth/start",
		path: "/api/auth/start",
		getParentRoute: () => Route$24
	}),
	ApiOauthCallbackRoute: Route$8.update({
		id: "/api/oauth/callback",
		path: "/api/oauth/callback",
		getParentRoute: () => Route$24
	}),
	ApiOauthIntrospectRoute: Route$7.update({
		id: "/api/oauth/introspect",
		path: "/api/oauth/introspect",
		getParentRoute: () => Route$24
	}),
	ApiOauthTokenRoute: Route$6.update({
		id: "/api/oauth/token",
		path: "/api/oauth/token",
		getParentRoute: () => Route$24
	}),
	ApiStripeWebhookRoute: Route$5.update({
		id: "/api/stripe/webhook",
		path: "/api/stripe/webhook",
		getParentRoute: () => Route$24
	}),
	ApiV1MeRoute: Route$4.update({
		id: "/api/v1/me",
		path: "/api/v1/me",
		getParentRoute: () => Route$24
	}),
	ApiAuthCallbackPlatformRoute: Route$3.update({
		id: "/api/auth/callback/$platform",
		path: "/api/auth/callback/$platform",
		getParentRoute: () => Route$24
	}),
	ApiV1OauthRevokeRoute: Route$2.update({
		id: "/api/v1/oauth/revoke",
		path: "/api/v1/oauth/revoke",
		getParentRoute: () => Route$24
	}),
	ApiV1OauthTokenRoute: Route$1.update({
		id: "/api/v1/oauth/token",
		path: "/api/v1/oauth/token",
		getParentRoute: () => Route$24
	}),
	ApiV1AccountsAccountIdTokenRoute: Route.update({
		id: "/api/v1/accounts/$accountId/token",
		path: "/api/v1/accounts/$accountId/token",
		getParentRoute: () => Route$24
	})
};
var routeTree = Route$24._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	return createRouter({
		routeTree,
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { Route$22 as a, deleteApp as c, disconnectAccount as d, revokeApp as f, Route$21 as i, deleteMyData as l, updateApp as m, Route$13 as n, approveConsent as o, rotateAppSecret as p, Route$17 as r, createApp as s, router_exports as t, denyConsent as u };
