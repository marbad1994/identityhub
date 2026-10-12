import { C as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Page } from "./shell-kuJDO8_1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/privacy-7W4yZLRy.js
var import_jsx_runtime = require_jsx_runtime();
function Privacy() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-3xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-4xl font-semibold tracking-tight",
			children: "Privacy Policy"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-6 space-y-4 text-muted",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "When you sign in or connect an account, Identity Hub stores the platform account id, name, handle and picture the platform returns, plus its access and refresh tokens. Tokens are encrypted with AES-256-GCM before they are written." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "An app you authorize receives your Identity Hub user id, name and picture, and the name, handle and picture of the accounts you chose. Only for accounts granted with publish access can the app request that account's platform access token, from its server, to post on your behalf." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "We keep a log of sign-ins, connections and grants so you can see who has access. We do not sell data." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Disconnecting an account or removing an app takes effect immediately. To delete everything, use the Data Deletion page or email support@makketing.com." })
			]
		})]
	});
}
//#endregion
export { Privacy as component };
