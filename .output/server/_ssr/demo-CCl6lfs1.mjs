import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as SiteHeader, i as SiteFooter } from "./shell-kuJDO8_1.mjs";
import { r as initialWidget, t as PROVIDERS } from "./hub-Bm3YMrkJ.mjs";
import { o as useCurrentUserState, r as fetchHub } from "./use-current-user-qau2SOjb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/demo-CCl6lfs1.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ensureScript() {
	if (window.IdentityHub) return Promise.resolve();
	const existing = document.querySelector("script[data-identity-hub]");
	if (existing) return new Promise((resolve, reject) => {
		if (window.IdentityHub) resolve();
		existing.addEventListener("load", () => resolve(), { once: true });
		existing.addEventListener("error", () => reject(/* @__PURE__ */ new Error("Widget failed to load")), { once: true });
	});
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "/identity-hub-widget.js";
		script.dataset.identityHub = "1";
		script.onload = () => resolve();
		script.onerror = () => reject(/* @__PURE__ */ new Error("Widget failed to load"));
		document.body.appendChild(script);
	});
}
function WidgetFrame({ config, onSelect }) {
	const hostRef = (0, import_react.useRef)(null);
	const onSelectRef = (0, import_react.useRef)(onSelect);
	const [error, setError] = (0, import_react.useState)(null);
	onSelectRef.current = onSelect;
	(0, import_react.useEffect)(() => {
		if (!hostRef.current) return;
		let dead = false;
		let mounted;
		setError(null);
		ensureScript().then(() => {
			if (dead || !window.IdentityHub || !hostRef.current) return;
			mounted = window.IdentityHub.mount(hostRef.current, {
				appName: config.name,
				theme: config.theme,
				providers: config.providers,
				mode: "sandbox",
				onComplete: (detail) => onSelectRef.current?.(detail)
			});
		}).catch(() => {
			if (!dead) setError("The widget script did not load.");
		});
		return () => {
			dead = true;
			mounted?.destroy();
		};
	}, [
		config.name,
		config.theme,
		config.providers.join("|")
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: hostRef }), error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		role: "alert",
		className: "mt-3 text-sm text-danger",
		children: error
	}) : null] });
}
function DemoPage() {
	const { user, isPending } = useCurrentUserState();
	const [config, setConfig] = (0, import_react.useState)(initialWidget);
	const [events, setEvents] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		let dead = false;
		fetchHub().then((hub) => {
			if (!dead) setConfig(hub.widget);
		}).catch(() => void 0);
		return () => {
			dead = true;
		};
	}, [user]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-[minmax(0,420px)_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-muted",
					children: "Embeddable widget"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-4xl font-semibold tracking-tight",
					children: "Try a sandbox selection."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: user ? "This picker uses the widget saved in your workspace. Continuing does not authenticate anyone." : "Sandbox mode returns a selection and no token. Sign in to preview the widget saved in your workspace."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-64 animate-pulse rounded-card bg-bg-alt" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WidgetFrame, {
						config,
						onSelect: (detail) => setEvents((current) => [detail, ...current].slice(0, 8))
					})
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-semibold tracking-tight",
				children: "Events on this page"
			}), events.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "Nothing yet. Choose platforms and continue."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 space-y-3",
				children: events.map((event, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "rounded-card border border-line bg-bg p-4 shadow-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: event.appName
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							"authenticated: false ·",
							" ",
							event.platforms.map((id) => PROVIDERS.find((p) => p.id === id)?.name ?? id).join(", ")
						]
					})]
				}, `${event.appName}-${index}`))
			})] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {})
	] });
}
//#endregion
export { DemoPage as component };
