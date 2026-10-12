import { C as require_jsx_runtime, b as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as Route$17 } from "./router-BHOTKWwQ.mjs";
import { n as Page, o as useSession, t as ErrorNote } from "./shell-kuJDO8_1.mjs";
import { t as PlatformButtons } from "./platform-buttons-Dx4kulwR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-DYPgjryx.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	const { user, platforms } = useSession();
	const { return_to: returnTo = "/workspace", error } = Route$17.useSearch();
	if (user && !error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/workspace" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-4xl font-semibold tracking-tight",
				children: "Sign in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-muted",
				children: "Use any platform you post on. The account you sign in with is connected too, and you can add more afterwards."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformButtons, {
					platforms,
					intent: "login",
					returnTo,
					verb: "Continue with"
				})
			})
		]
	});
}
//#endregion
export { Login as component };
