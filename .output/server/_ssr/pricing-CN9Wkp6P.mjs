import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as SiteHeader, i as SiteFooter } from "./shell-kuJDO8_1.mjs";
import { a as openCheckout, o as useCurrentUserState } from "./use-current-user-qau2SOjb.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pricing-CN9Wkp6P.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var plans = [
	{
		id: "starter",
		name: "Starter",
		price: "$39",
		detail: "For the first product and a handful of live profiles.",
		points: [
			"5 live profiles",
			"Sandbox profiles stay free",
			"Grants, widget, and code exchange",
			"Email support"
		],
		featured: false
	},
	{
		id: "growth",
		name: "Growth",
		price: "$129",
		detail: "For a product already connecting customer accounts.",
		points: [
			"25 live profiles",
			"Sandbox profiles stay free",
			"Grants, widget, and code exchange",
			"Email support"
		],
		featured: true
	},
	{
		id: "scale",
		name: "Scale",
		price: "$349",
		detail: "For a suite that needs a higher live-profile cap.",
		points: [
			"100 live profiles",
			"Sandbox profiles stay free",
			"Grants, widget, and code exchange",
			"Priority support"
		],
		featured: false
	}
];
function Pricing() {
	const { user, isPending } = useCurrentUserState();
	const [error, setError] = (0, import_react.useState)(null);
	const [pendingPlan, setPendingPlan] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "mx-auto max-w-6xl px-5 py-16",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-muted",
					children: "Self-serve"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 text-5xl font-semibold tracking-tight",
					children: "Pick a plan"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 max-w-xl text-muted",
					children: "Sandbox profiles stay free. Live OAuth uses the profile cap on the active plan. Cancel any time from Stripe."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-10 grid gap-4 md:grid-cols-3",
					children: plans.map((plan) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
						className: `flex flex-col rounded-card border bg-bg p-6 shadow-card ${plan.featured ? "border-ink" : "border-line"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-xl font-semibold",
									children: plan.name
								}), plan.featured ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-bg-alt px-2.5 py-1 text-xs font-semibold",
									children: "Most teams"
								}) : null]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-4 text-4xl font-semibold tracking-tight",
								children: [plan.price, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-base font-medium text-muted",
									children: "/mo"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 text-sm text-muted",
								children: plan.detail
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "mt-4 flex-1 space-y-2 text-sm",
								children: plan.points.map((point) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: point }, point))
							}),
							isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "mt-6 h-11 animate-pulse rounded-full bg-bg-alt" }) : null,
							!isPending && !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								className: "mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-on-ink no-underline",
								children: "Sign in to subscribe"
							}) : null,
							!isPending && user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: pendingPlan !== null,
								className: "mt-6 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50",
								onClick: async () => {
									setPendingPlan(plan.id);
									setError(null);
									try {
										const result = await openCheckout({ data: { plan: plan.id } });
										if (!result.ok) setError(result.error);
										else window.location.assign(result.url);
									} catch (cause) {
										setError(cause instanceof Error ? cause.message : "Checkout failed.");
									} finally {
										setPendingPlan(null);
									}
								},
								children: pendingPlan === plan.id ? "Opening checkout…" : `Start ${plan.name}`
							}) : null
						]
					}, plan.id))
				}),
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					role: "alert",
					className: "mt-6 text-sm text-danger",
					children: error
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-8 text-sm text-muted",
					children: "Need more than 100 profiles? Email support@socialpostapi.makketing.com."
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, {})
	] });
}
//#endregion
export { Pricing as component };
