import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as platformLabel, n as SCOPES } from "./platforms-BdWV-H2d.mjs";
import { a as Route$22, o as approveConsent, u as denyConsent } from "./router-BHOTKWwQ.mjs";
import { n as Page, o as useSession, r as PlatformIcon, t as ErrorNote } from "./shell-kuJDO8_1.mjs";
import { t as PlatformButtons } from "./platform-buttons-Dx4kulwR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/authorize-BxFVqHiB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Authorize() {
	const consent = Route$22.useLoaderData();
	const search = Route$22.useSearch();
	const { platforms } = useSession();
	const request = {
		clientId: search.client_id,
		redirectUri: search.redirect_uri,
		state: search.state,
		scope: search.scope
	};
	const here = `/authorize?${new URLSearchParams(Object.entries(search).filter((entry) => Boolean(entry[1])))}`;
	const view = consent.ok ? consent.view : null;
	const [selected, setSelected] = (0, import_react.useState)(() => {
		const grantable = view?.accounts.filter((account) => account.grantable.length > 0) ?? [];
		const previous = grantable.filter((account) => account.granted);
		return (previous.length > 0 ? previous : grantable).map((account) => account.id);
	});
	const [error, setError] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	if (!consent.ok) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-semibold tracking-tight",
				children: "This sign-in link is not valid"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: consent.error }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 text-muted",
				children: "Go back to the app and try again. If it keeps happening, contact the app's developer."
			})
		]
	});
	const finish = async (work) => {
		setBusy(true);
		setError(null);
		try {
			const result = await work();
			if (result.ok) window.location.assign(result.redirect);
			else setError(result.error);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Something went wrong.");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, {
		width: "max-w-lg",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-muted",
				children: "Identity Hub"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
				className: "mt-2 text-3xl font-semibold tracking-tight",
				children: [consent.app.name, " wants to use your accounts"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted",
				children: consent.app.homepageUrl
			}),
			!view ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-4 text-muted",
					children: [
						"Sign in to choose which accounts ",
						consent.app.name,
						" may use."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformButtons, {
					platforms,
					intent: "login",
					returnTo: here,
					verb: "Continue with"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-6 grid gap-1 text-sm",
					children: view.scopes.map((scope) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold capitalize",
							children: scope
						}),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: SCOPES[scope]
						})
					] }, scope))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("fieldset", {
					className: "mt-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("legend", {
							className: "text-sm font-semibold",
							children: [
								"Accounts ",
								consent.app.name,
								" may use"
							]
						}),
						view.accounts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted",
							children: "Connect an account below first."
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-2 grid gap-2",
							children: view.accounts.map((account) => {
								const disabled = account.grantable.length === 0;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: `flex min-h-11 items-center gap-3 rounded-2xl border border-line px-4 py-2 ${disabled ? "opacity-50" : "cursor-pointer"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											className: "size-4",
											disabled,
											checked: selected.includes(account.id),
											onChange: (event) => setSelected((current) => event.target.checked ? [...current, account.id] : current.filter((id) => id !== account.id))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformIcon, {
											id: account.provider,
											className: "size-5 shrink-0"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block truncate font-medium",
												children: account.displayName
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "block truncate text-sm text-muted",
												children: [
													platformLabel(account.provider),
													" · ",
													account.handle,
													disabled ? " · cannot grant the requested access" : ` · ${account.grantable.join(", ")}`
												]
											})]
										})
									]
								}, account.id);
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", {
					className: "mt-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", {
						className: "min-h-11 cursor-pointer py-2 text-sm font-medium",
						children: "Connect another account"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformButtons, {
							platforms,
							intent: "connect",
							returnTo: here,
							verb: "Connect"
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-2 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy,
						className: "min-h-11 rounded-full bg-bg-alt px-4 text-sm font-semibold disabled:opacity-50",
						onClick: () => finish(() => denyConsent({ data: request })),
						children: "Deny"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: busy || selected.length === 0,
						className: "min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink disabled:opacity-50",
						onClick: () => finish(() => approveConsent({ data: {
							...request,
							accountIds: selected
						} })),
						children: "Allow"
					})]
				})
			] })
		]
	});
}
//#endregion
export { Authorize as component };
