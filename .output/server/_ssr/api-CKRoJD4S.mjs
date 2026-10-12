import { n as createMiddleware, r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { hn as object, un as array, vn as string } from "../_libs/@better-auth/core+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-CKRoJD4S.js
/** Server functions the pages call. Each resolves the session from the request cookie. */
var requireUser = createMiddleware({ type: "function" }).server(async ({ next }) => {
	const { currentUser } = await import("./request-DxP1t9h7.mjs");
	const user = await currentUser();
	if (!user) throw new Error("Sign in first.");
	return next({ context: { user } });
});
var fetchSession_createServerFn_handler = createServerRpc({
	id: "257064b4e25d0aa93a825ca48490bfdab778b86b906d43fcbbe4d06d5a293118",
	name: "fetchSession",
	filename: "src/lib/api.ts"
}, (opts) => fetchSession.__executeServer(opts));
var fetchSession = createServerFn({ method: "GET" }).handler(fetchSession_createServerFn_handler, async () => {
	const { platformsForLogin } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	const { currentUser } = await import("./request-DxP1t9h7.mjs");
	return {
		user: await currentUser(),
		platforms: platformsForLogin()
	};
});
var fetchWorkspace_createServerFn_handler = createServerRpc({
	id: "2a8642ff144d532eea39b22a825569b4514cd3f40d03805e6f6451c566fd645c",
	name: "fetchWorkspace",
	filename: "src/lib/api.ts"
}, (opts) => fetchWorkspace.__executeServer(opts));
var fetchWorkspace = createServerFn({ method: "GET" }).middleware([requireUser]).handler(fetchWorkspace_createServerFn_handler, async ({ context }) => {
	const { getWorkspace } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return getWorkspace(context.user);
});
var disconnectAccount_createServerFn_handler = createServerRpc({
	id: "d348a9a7c9457fa85b7d6796516a89859fdd17784a0a24f7e899090d67fb80ce",
	name: "disconnectAccount",
	filename: "src/lib/api.ts"
}, (opts) => disconnectAccount.__executeServer(opts));
var disconnectAccount = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ accountId: string().max(64) })).handler(disconnectAccount_createServerFn_handler, async ({ context, data }) => {
	const { disconnectAccount } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return disconnectAccount(context.user.id, data.accountId);
});
var revokeApp_createServerFn_handler = createServerRpc({
	id: "e38f96766856372a48f5b7b950e04d253300fd21687725e7049f6bb8a121379c",
	name: "revokeApp",
	filename: "src/lib/api.ts"
}, (opts) => revokeApp.__executeServer(opts));
var revokeApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(revokeApp_createServerFn_handler, async ({ context, data }) => {
	const { revokeApp } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return revokeApp(context.user.id, data.appId);
});
var appFields = object({
	name: string().max(60),
	homepageUrl: string().max(300),
	redirectUris: array(string().max(300)).max(10)
});
var createApp_createServerFn_handler = createServerRpc({
	id: "f98dfd49da9b1a25d1bf775371d99920c228cc490d1bd4a4db831955700b2611",
	name: "createApp",
	filename: "src/lib/api.ts"
}, (opts) => createApp.__executeServer(opts));
var createApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(appFields).handler(createApp_createServerFn_handler, async ({ context, data }) => {
	const { createApp } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return createApp(context.user.id, data);
});
var updateApp_createServerFn_handler = createServerRpc({
	id: "544a6acbfd25d78f759d7a15d35c7f6a227e569bf38dd056565cdef31cf18153",
	name: "updateApp",
	filename: "src/lib/api.ts"
}, (opts) => updateApp.__executeServer(opts));
var updateApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(appFields.extend({ appId: string().max(64) })).handler(updateApp_createServerFn_handler, async ({ context, data }) => {
	const { updateApp } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return updateApp(context.user.id, data);
});
var rotateAppSecret_createServerFn_handler = createServerRpc({
	id: "92458029fa488ab4a24300cab163ac5e13e891f73f0e05231f005daf8ad04113",
	name: "rotateAppSecret",
	filename: "src/lib/api.ts"
}, (opts) => rotateAppSecret.__executeServer(opts));
var rotateAppSecret = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(rotateAppSecret_createServerFn_handler, async ({ context, data }) => {
	const { rotateAppSecret } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return rotateAppSecret(context.user.id, data.appId);
});
var deleteApp_createServerFn_handler = createServerRpc({
	id: "837b2b8a25ee382b2f757a67eca8370d9a6e2515c8e81feefd2e1ddb4355ae2f",
	name: "deleteApp",
	filename: "src/lib/api.ts"
}, (opts) => deleteApp.__executeServer(opts));
var deleteApp = createServerFn({ method: "POST" }).middleware([requireUser]).validator(object({ appId: string().max(64) })).handler(deleteApp_createServerFn_handler, async ({ context, data }) => {
	const { deleteApp } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	return deleteApp(context.user.id, data.appId);
});
var deleteMyData_createServerFn_handler = createServerRpc({
	id: "3cf7e22d12c8b72b2ae6d13494c3c428d94718680c903135319f1ec4d4f9aa8e",
	name: "deleteMyData",
	filename: "src/lib/api.ts"
}, (opts) => deleteMyData.__executeServer(opts));
var deleteMyData = createServerFn({ method: "POST" }).middleware([requireUser]).handler(deleteMyData_createServerFn_handler, async ({ context }) => {
	const { deleteUser } = await import("./workspace-DPF25t2B.mjs").then((n) => n.n).then((n) => n.n);
	await deleteUser(context.user.id);
	return { ok: true };
});
var authorizeRequest = object({
	clientId: string().max(80),
	redirectUri: string().max(500),
	state: string().max(500).optional(),
	scope: string().max(100).optional()
});
var fetchConsent_createServerFn_handler = createServerRpc({
	id: "ca205951add67ab0b0f8cefea4f8cd3b8f1b9e9f4ae43d5eb2660cfc2143ff42",
	name: "fetchConsent",
	filename: "src/lib/api.ts"
}, (opts) => fetchConsent.__executeServer(opts));
var fetchConsent = createServerFn({ method: "GET" }).validator(authorizeRequest).handler(fetchConsent_createServerFn_handler, async ({ data }) => {
	const { consentView } = await import("./apps-B_TU16ag.mjs");
	const { currentUser } = await import("./request-DxP1t9h7.mjs");
	return consentView((await currentUser())?.id ?? null, data);
});
var approveConsent_createServerFn_handler = createServerRpc({
	id: "ef5c585b1f25cb25fd416c373a36e9ba1a8ed9a9752c34be80437c3d1e120a67",
	name: "approveConsent",
	filename: "src/lib/api.ts"
}, (opts) => approveConsent.__executeServer(opts));
var approveConsent = createServerFn({ method: "POST" }).middleware([requireUser]).validator(authorizeRequest.extend({ accountIds: array(string().max(64)).max(100) })).handler(approveConsent_createServerFn_handler, async ({ context, data }) => {
	const { approve } = await import("./apps-B_TU16ag.mjs");
	return approve(context.user.id, data);
});
var denyConsent_createServerFn_handler = createServerRpc({
	id: "0a9b8b723e805885590101164ac6e479e9137b058aade6bd69398e267850b5e4",
	name: "denyConsent",
	filename: "src/lib/api.ts"
}, (opts) => denyConsent.__executeServer(opts));
var denyConsent = createServerFn({ method: "POST" }).validator(authorizeRequest).handler(denyConsent_createServerFn_handler, async ({ data }) => {
	const { deny } = await import("./apps-B_TU16ag.mjs");
	return deny(data);
});
//#endregion
export { approveConsent_createServerFn_handler, createApp_createServerFn_handler, deleteApp_createServerFn_handler, deleteMyData_createServerFn_handler, denyConsent_createServerFn_handler, disconnectAccount_createServerFn_handler, fetchConsent_createServerFn_handler, fetchSession_createServerFn_handler, fetchWorkspace_createServerFn_handler, revokeApp_createServerFn_handler, rotateAppSecret_createServerFn_handler, updateApp_createServerFn_handler };
