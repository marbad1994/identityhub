import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { l as deleteMyData } from "./router-BHOTKWwQ.mjs";
import { n as Page, o as useSession, t as ErrorNote } from "./shell-kuJDO8_1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/deletion-Bu3gNNDP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Deletion() {
	const { user } = useSession();
	const [done, setDone] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-4xl font-semibold tracking-tight",
				children: "Data Deletion"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-muted",
				children: "Deleting your Identity Hub account removes your profile, every connected account and its tokens, every app grant and token, any apps you registered, and your activity log. It does not delete anything on the platforms themselves; remove the app there too if you want the platform to forget the authorization."
			}),
			done ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 font-medium text-ok",
				children: "Your data was deleted."
			}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-6 min-h-11 rounded-full bg-danger px-5 text-sm font-semibold text-on-ink",
				onClick: async () => {
					if (!confirm("Delete your Identity Hub account and all its data? This cannot be undone.")) return;
					setError(null);
					try {
						await deleteMyData();
						setDone(true);
					} catch (cause) {
						setError(cause instanceof Error ? cause.message : "Could not delete the account.");
					}
				},
				children: "Delete my account and data"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-6 text-muted",
				children: "Sign in with the account you want removed, then come back here. Or email support@makketing.com."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error })
		]
	});
}
//#endregion
export { Deletion as component };
