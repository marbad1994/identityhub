import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SIGN_IN_PROVIDERS } from "./server-u54FaiYR.mjs";
import { i as Route$21 } from "./router-BHOTKWwQ.mjs";
import { a as SiteHeader, i as SiteFooter } from "./shell-kuJDO8_1.mjs";
import { r as signIn } from "./client-DHCqFwj5.mjs";
import { n as SCOPE_LABEL, t as PROVIDERS } from "./hub-Bm3YMrkJ.mjs";
import { i as lookupProduct, n as fetchConnectionsForConsent, o as useCurrentUserState, t as approveConnect } from "./use-current-user-qau2SOjb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/connect-cUSOmf7R.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Connect() {
	const { user, isPending } = useCurrentUserState();
	const { client_id: clientId = "", redirect_uri: redirectUri = "" } = Route$21.useSearch();
	const returnTo = `/connect?${new URLSearchParams({
		...clientId ? { client_id: clientId } : {},
		...redirectUri ? { redirect_uri: redirectUri } : {}
	}).toString()}`;
	const [product, setProduct] = (0, import_react.useState)(null);
	const [missing, setMissing] = (0, import_react.useState)(false);
	const [connections, setConnections] = (0, import_react.useState)([]);
	const [connectionId, setConnectionId] = (0, import_react.useState)("");
	const [scopes, setScopes] = (0, import_react.useState)(["profile"]);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (!clientId) return;
		lookupProduct({ data: { clientId } }).then((found) => {
			if (!found) setMissing(true);
			else setProduct(found);
		}).catch(() => setMissing(true));
	}, [clientId]);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		fetchConnectionsForConsent().then((payload) => {
			setConnections(payload.connections);
			const first = payload.connections[0];
			if (first) setConnectionId(first.id);
		}).catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load connections."));
	}, [user]);
	const selected = connections.find((item) => item.id === connectionId);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-lg px-5 py-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-muted",
					children: "Consent"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-4xl font-semibold tracking-tight",
					children: product ? product.name : "Connect an account"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: product ? `${product.name} is asking for access. The platform token stays on Identity Hub.` : missing ? "That client id is not registered." : "Looking up the app…"
				}),
				isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-muted",
					children: "Checking session…"
				}) : null,
				!isPending && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 grid gap-2",
					children: SIGN_IN_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						className: "min-h-11 rounded-full bg-ink text-sm font-semibold text-on-ink",
						onClick: () => signIn(provider.providerId, { callbackURL: returnTo }),
						children: ["Continue with ", provider.label]
					}, provider.providerId))
				}) : null,
				user && selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mt-6 rounded-card border border-line p-5 shadow-card",
					onSubmit: async (event) => {
						event.preventDefault();
						const result = await approveConnect({ data: {
							clientId,
							connectionId,
							scopes,
							redirectUri: redirectUri || product?.origin || ""
						} });
						if (!result.ok) setError(result.error);
						else window.location.assign(result.redirect);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-sm font-medium",
							children: ["Account", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								className: "mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3",
								value: connectionId,
								onChange: (event) => {
									setConnectionId(event.target.value);
									const next = connections.find((item) => item.id === event.target.value);
									setScopes(next?.scopes.slice(0, 1) ?? ["profile"]);
								},
								children: connections.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
									value: item.id,
									children: [
										PROVIDERS.find((provider) => provider.id === item.provider)?.name,
										" · ",
										item.handle
									]
								}, item.id))
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: selected.scopes.map((scope) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-pressed": scopes.includes(scope),
								className: `min-h-11 rounded-full px-3 text-sm font-medium ${scopes.includes(scope) ? "bg-ink text-on-ink" : "bg-bg-alt"}`,
								onClick: () => setScopes((current) => current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]),
								children: SCOPE_LABEL[scope]
							}, scope))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "submit",
							className: "mt-5 min-h-11 w-full rounded-full bg-ink text-sm font-semibold text-on-ink",
							children: "Allow and return"
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							role: "alert",
							className: "mt-3 text-sm text-danger",
							children: error
						}) : null
					]
				}) : null,
				user && connections.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-muted",
					children: "Connect an account in the workspace first."
				}) : null
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {})
	] });
}
//#endregion
export { Connect as component };
