import { C as require_jsx_runtime, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as PLATFORMS } from "./platforms-BdWV-H2d.mjs";
import { n as Page, o as useSession, r as PlatformIcon } from "./shell-kuJDO8_1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-G9dP5lH3.js
var import_jsx_runtime = require_jsx_runtime();
var steps = [
	["Sign in", "Log in with X, Instagram, Facebook, TikTok, LinkedIn, YouTube, Reddit or Snapchat. No new password."],
	["Connect", "Add the other accounts you publish to. Tokens are encrypted and stay on the hub."],
	["Choose", "When an app such as SocialPostAPI asks, pick exactly which accounts it may use. Revoke any time."]
];
function Home() {
	const { user } = useSession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl sm:leading-none",
			children: ["One login.", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "block text-muted",
				children: "Your platforms, your choice."
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-5 max-w-xl text-lg text-muted",
			children: "Identity Hub signs you in to every Makketing product with the social accounts you already have, and lets you decide which of them each product is allowed to use."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-8 flex flex-wrap gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: user ? "/workspace" : "/login",
				className: "inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-on-ink no-underline hover:opacity-85",
				children: user ? "Open workspace" : "Sign in"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/docs",
				className: "inline-flex min-h-11 items-center rounded-full bg-bg-alt px-5 text-sm font-semibold text-fg no-underline",
				children: "Integrate an app"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "mt-12 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium",
			children: PLATFORMS.map((platform) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "inline-flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformIcon, {
					id: platform.id,
					className: "size-5"
				}), platform.label]
			}, platform.id))
		})
	] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
		className: "mt-16 grid gap-4 md:grid-cols-3",
		children: steps.map(([title, body], index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "rounded-card border border-line bg-bg p-6 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm font-semibold text-muted",
					children: ["0", index + 1]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 text-xl font-semibold tracking-tight",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted",
					children: body
				})
			]
		}, title))
	})] });
}
//#endregion
export { Home as component };
