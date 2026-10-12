import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, S as useRouter, Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as platformLabel } from "./platforms-BdWV-H2d.mjs";
import { i as KeyRound, n as Trash2, o as Copy } from "../_libs/lucide-react.mjs";
import { c as deleteApp, d as disconnectAccount, f as revokeApp, m as updateApp, n as Route$13, p as rotateAppSecret, s as createApp } from "./router-BHOTKWwQ.mjs";
import { n as Page, o as useSession, r as PlatformIcon, t as ErrorNote } from "./shell-kuJDO8_1.mjs";
import { t as PlatformButtons } from "./platform-buttons-Dx4kulwR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-DgBoenHY.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Run a mutation, refresh the page data, and surface any error. */
function useAction() {
	const router = useRouter();
	const [error, setError] = (0, import_react.useState)(null);
	const run = async (work) => {
		setError(null);
		try {
			const result = await work();
			if (!result.ok) setError(result.error);
			await router.invalidate();
			return result;
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "Something went wrong.");
			return null;
		}
	};
	return {
		error,
		run
	};
}
function Section({ title, description, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-2xl font-semibold tracking-tight",
				children: title
			}),
			description ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-muted",
				children: description
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5",
				children
			})
		]
	});
}
function Workspace() {
	const workspace = Route$13.useLoaderData();
	const { error: flowError } = Route$13.useSearch();
	const { error, run } = useAction();
	const { platforms } = useSession();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Page, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [workspace.user.avatarUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: workspace.user.avatarUrl,
				alt: "",
				className: "size-12 rounded-full"
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold text-muted",
				children: "Signed in"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-3xl font-semibold tracking-tight",
				children: workspace.user.displayName
			})] })]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: flowError ?? error }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			title: "Connected accounts",
			description: "Apps can only use the accounts you choose for them.",
			children: [
				workspace.accounts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "No accounts yet."
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid gap-2",
					children: workspace.accounts.map((account) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex min-w-0 items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformIcon, {
								id: account.provider,
								className: "size-5 shrink-0"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "truncate font-medium",
									children: account.displayName
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "truncate text-sm text-muted",
									children: [
										platformLabel(account.provider),
										" · ",
										account.handle
									]
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft",
							onClick: () => {
								if (confirm(`Disconnect ${account.handle}? Apps lose access to it.`)) run(() => disconnectAccount({ data: { accountId: account.id } }));
							},
							children: "Disconnect"
						})]
					}, account.id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlatformButtons, {
						platforms,
						intent: "connect",
						returnTo: "/workspace",
						verb: "Connect"
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "Apps with access",
			description: "Remove an app to revoke every token it holds for you.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthorizedApps, {
				workspace,
				onRevoke: (appId) => run(() => revokeApp({ data: { appId } }))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
			title: "Your apps",
			description: "Register a product to let people sign in with Identity Hub and grant it accounts.",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeveloperApps, { apps: workspace.developerApps })
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
			title: "Activity",
			children: [workspace.activity.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted",
				children: "Nothing yet."
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y divide-line",
				children: workspace.activity.map((event) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap justify-between gap-x-4 py-2 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-medium",
							children: event.action
						}),
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted",
							children: event.detail
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("time", {
						className: "text-muted",
						dateTime: event.at,
						children: new Date(event.at).toLocaleString()
					})]
				}, event.id))
			})]
		})
	] });
}
function AuthorizedApps({ workspace, onRevoke }) {
	if (workspace.authorizedApps.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-muted",
		children: "No app has access yet."
	});
	const accounts = new Map(workspace.accounts.map((account) => [account.id, account]));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "grid gap-3",
		children: workspace.authorizedApps.map((app) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "rounded-2xl border border-line p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: app.homepageUrl,
					className: "font-semibold text-fg no-underline hover:underline",
					rel: "noreferrer",
					target: "_blank",
					children: app.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft",
					onClick: () => {
						if (confirm(`Remove ${app.name}'s access to all your accounts?`)) onRevoke(app.appId);
					},
					children: "Remove access"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-2 grid gap-1 text-sm text-muted",
				children: app.grants.map((grant) => {
					const account = accounts.get(grant.accountId);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
						account ? `${platformLabel(account.provider)} ${account.handle}` : "Removed account",
						" · ",
						grant.scopes.join(", ")
					] }, grant.accountId);
				})
			})]
		}, app.appId))
	});
}
function SecretNotice({ clientId, secret, onDone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-ok bg-ok-soft p-4 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-semibold",
				children: "Copy the client secret now. It is not shown again."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
				className: "mt-3 grid gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-muted",
					children: "client_id"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
					className: "break-all",
					children: clientId
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
					className: "text-muted",
					children: "client_secret"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
					className: "flex items-center gap-2 break-all",
					children: [secret, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": "Copy secret",
						className: "inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-bg",
						onClick: () => navigator.clipboard.writeText(secret),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, {
							className: "size-4",
							"aria-hidden": "true"
						})
					})]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "mt-3 min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink",
				onClick: onDone,
				children: "I saved it"
			})
		]
	});
}
function AppForm({ app, onSaved }) {
	const { error, run } = useAction();
	const submit = async (event) => {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const fields = {
			name: String(form.get("name") ?? ""),
			homepageUrl: String(form.get("homepageUrl") ?? ""),
			redirectUris: String(form.get("redirectUris") ?? "").split(/\s+/).filter(Boolean)
		};
		if (app) {
			if ((await run(() => updateApp({ data: {
				...fields,
				appId: app.id
			} })))?.ok) onSaved(null);
		} else {
			const result = await run(() => createApp({ data: fields }));
			if (result?.ok) onSaved({
				clientId: result.clientId,
				clientSecret: result.clientSecret
			});
		}
	};
	const input = "mt-1 w-full min-h-11 rounded-xl border border-line bg-bg px-3";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "grid gap-3 rounded-2xl border border-line p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm font-medium",
				children: ["Name", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					name: "name",
					required: true,
					defaultValue: app?.name,
					className: input,
					placeholder: "SocialPostAPI"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm font-medium",
				children: ["Homepage URL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					name: "homepageUrl",
					type: "url",
					required: true,
					defaultValue: app?.homepageUrl,
					className: input,
					placeholder: "https://socialpostapi.makketing.com"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "text-sm font-medium",
				children: ["Redirect URIs, one per line", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					name: "redirectUris",
					required: true,
					rows: 3,
					defaultValue: app?.redirectUris.join("\n"),
					className: `${input} py-2`,
					placeholder: "https://socialpostapi.makketing.com/auth/identityhub/callback"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				className: "min-h-11 rounded-full bg-ink px-4 text-sm font-semibold text-on-ink",
				children: app ? "Save" : "Register app"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error })
		]
	});
}
function DeveloperApps({ apps }) {
	const { error, run } = useAction();
	const [secret, setSecret] = (0, import_react.useState)(null);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [creating, setCreating] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-3",
		children: [
			secret ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecretNotice, {
				clientId: secret.clientId,
				secret: secret.clientSecret,
				onDone: () => setSecret(null)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorNote, { message: error }),
			apps.map((app) => editing === app.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppForm, {
				app,
				onSaved: () => setEditing(null)
			}, app.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-line p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-semibold",
						children: app.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "min-h-11 rounded-full px-3 text-sm font-medium hover:bg-bg-alt",
								onClick: () => setEditing(app.id),
								children: "Edit"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium hover:bg-bg-alt",
								onClick: async () => {
									if (!confirm(`Rotate ${app.name}'s client secret? The old one stops working immediately.`)) return;
									const result = await run(() => rotateAppSecret({ data: { appId: app.id } }));
									if (result?.ok) setSecret({
										clientId: app.clientId,
										clientSecret: result.clientSecret
									});
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, {
									className: "size-4",
									"aria-hidden": "true"
								}), "New secret"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-danger hover:bg-danger-soft",
								onClick: () => {
									if (confirm(`Delete ${app.name}? Everyone's grants and tokens for it are removed.`)) run(() => deleteApp({ data: { appId: app.id } }));
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, {
									className: "size-4",
									"aria-hidden": "true"
								}), "Delete"]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "mt-2 grid gap-1 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-x-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: "client_id"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "break-all",
							children: app.clientId
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-x-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
							className: "text-muted",
							children: "Redirect URIs"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
							className: "break-all",
							children: app.redirectUris.join(", ")
						})]
					})]
				})]
			}, app.id)),
			creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppForm, { onSaved: (created) => {
				setCreating(false);
				if (created) setSecret(created);
			} }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				className: "min-h-11 justify-self-start rounded-full bg-bg-alt px-4 text-sm font-semibold",
				onClick: () => setCreating(true),
				children: "Register an app"
			})
		]
	});
}
//#endregion
export { Workspace as component };
