import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as PlatformIcon } from "./shell-kuJDO8_1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/platform-buttons-Dx4kulwR.js
var import_jsx_runtime = require_jsx_runtime();
/** Full-page links into the platform OAuth flow (`/api/auth/start`). */
function PlatformButtons({ platforms, intent, returnTo, verb }) {
	if (platforms.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted",
		children: "No platform is configured on this hub yet. The host sets each platform's client id and secret."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid gap-2 sm:grid-cols-2",
		children: platforms.map((platform) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
			href: `/api/auth/start?${new URLSearchParams({
				platform: platform.id,
				intent,
				return_to: returnTo
			})}`,
			className: "inline-flex min-h-11 items-center gap-3 rounded-full border border-line bg-bg px-4 text-sm font-semibold text-fg no-underline hover:bg-bg-alt",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformIcon, {
					id: platform.id,
					className: "size-5"
				}),
				verb,
				" ",
				platform.label
			]
		}, platform.id))
	});
}
//#endregion
export { PlatformButtons as t };
