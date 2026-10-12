import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { t as authMiddleware } from "./middleware-CuQiLuJ2.mjs";
import { cn as _enum, hn as object, un as array, vn as string } from "../_libs/@better-auth/core+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-8BJf0blb.js
async function originFromRequest() {
	const { getRequest } = await import("./ssr.mjs").then((n) => n.s).then((n) => n.t);
	return getRequest().url;
}
var scopes = array(string()).max(8);
var fetchHub_createServerFn_handler = createServerRpc({
	id: "7c38ead7e1de22cbe8879ddf046fed658a799007813e284ddf076e7e454dbd3f",
	name: "fetchHub",
	filename: "src/lib/broker/api.ts"
}, (opts) => fetchHub.__executeServer(opts));
var fetchHub = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(fetchHub_createServerFn_handler, async ({ context }) => {
	const { getHub } = await import("./hub.server-Dct6fiIS.mjs");
	return getHub(context.userId);
});
var connectSandboxAccount_createServerFn_handler = createServerRpc({
	id: "f14fad61a218c44f8a9cfef09ba374f280e31dcdecaff5d330ec984519e4b921",
	name: "connectSandboxAccount",
	filename: "src/lib/broker/api.ts"
}, (opts) => connectSandboxAccount.__executeServer(opts));
var connectSandboxAccount = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	provider: string(),
	handle: string().max(40),
	displayName: string().max(60),
	scopes
})).handler(connectSandboxAccount_createServerFn_handler, async ({ context, data }) => {
	const { connectSandbox } = await import("./hub.server-Dct6fiIS.mjs");
	return connectSandbox(context.userId, data);
});
var beginLiveConnect_createServerFn_handler = createServerRpc({
	id: "0061d074e1870765af606a856447371e6516b9aaa191be6894a2a7ab487b9512",
	name: "beginLiveConnect",
	filename: "src/lib/broker/api.ts"
}, (opts) => beginLiveConnect.__executeServer(opts));
var beginLiveConnect = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	provider: string(),
	scopes
})).handler(beginLiveConnect_createServerFn_handler, async ({ context, data }) => {
	const { appOrigin, beginOAuth } = await import("./hub.server-Dct6fiIS.mjs");
	return beginOAuth(context.userId, data, appOrigin(await originFromRequest()));
});
var disconnectConnection_createServerFn_handler = createServerRpc({
	id: "bb59b69cf9d9fcb0fece84d638c1299d76ccfda56172d0445d982531b48a845b",
	name: "disconnectConnection",
	filename: "src/lib/broker/api.ts"
}, (opts) => disconnectConnection.__executeServer(opts));
var disconnectConnection = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ connectionId: string() })).handler(disconnectConnection_createServerFn_handler, async ({ context, data }) => {
	const { disconnectAccount } = await import("./hub.server-Dct6fiIS.mjs");
	return disconnectAccount(context.userId, data.connectionId);
});
var registerProduct_createServerFn_handler = createServerRpc({
	id: "a5595ad3fbbf2944231c0bd4723bbf3bcb65f40b8e480b651db563cb4c37f04a",
	name: "registerProduct",
	filename: "src/lib/broker/api.ts"
}, (opts) => registerProduct.__executeServer(opts));
var registerProduct = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	name: string().max(48),
	origin: string().max(200),
	description: string().max(140)
})).handler(registerProduct_createServerFn_handler, async ({ context, data }) => {
	const { addProduct } = await import("./hub.server-Dct6fiIS.mjs");
	return addProduct(context.userId, data);
});
var hideProductSecret_createServerFn_handler = createServerRpc({
	id: "02922ae88fa0dff148c14e20b45af347e6955b4fb557efa294f557dcd3a42ad3",
	name: "hideProductSecret",
	filename: "src/lib/broker/api.ts"
}, (opts) => hideProductSecret.__executeServer(opts));
var hideProductSecret = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ productId: string() })).handler(hideProductSecret_createServerFn_handler, async ({ context, data }) => {
	const { dismissProductSecret } = await import("./hub.server-Dct6fiIS.mjs");
	return dismissProductSecret(context.userId, data.productId);
});
var removeProduct_createServerFn_handler = createServerRpc({
	id: "dfc7ccb2a25d5447721e206057a1c29463c990c8b4a0327c9cf2b67cecc61d30",
	name: "removeProduct",
	filename: "src/lib/broker/api.ts"
}, (opts) => removeProduct.__executeServer(opts));
var removeProduct = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ productId: string() })).handler(removeProduct_createServerFn_handler, async ({ context, data }) => {
	const { deleteProduct } = await import("./hub.server-Dct6fiIS.mjs");
	return deleteProduct(context.userId, data.productId);
});
var saveGrant_createServerFn_handler = createServerRpc({
	id: "9c60ed6aa56174fe77f24c2053088a160b37ebcccf49b440f8bee740aefbb0d5",
	name: "saveGrant",
	filename: "src/lib/broker/api.ts"
}, (opts) => saveGrant.__executeServer(opts));
var saveGrant = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	productId: string(),
	connectionId: string(),
	scopes
})).handler(saveGrant_createServerFn_handler, async ({ context, data }) => {
	const { setGrant } = await import("./hub.server-Dct6fiIS.mjs");
	return setGrant(context.userId, data);
});
var saveWidget_createServerFn_handler = createServerRpc({
	id: "b81209195eb0f1613f253ef72c46c8868956aaced0a311bd82fb55c83fa6a123",
	name: "saveWidget",
	filename: "src/lib/broker/api.ts"
}, (opts) => saveWidget.__executeServer(opts));
var saveWidget = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	name: string().max(40),
	theme: string(),
	providers: array(string()).max(8)
})).handler(saveWidget_createServerFn_handler, async ({ context, data }) => {
	const { updateWidget } = await import("./hub.server-Dct6fiIS.mjs");
	return updateWidget(context.userId, data);
});
var loadSamples_createServerFn_handler = createServerRpc({
	id: "9f9609100180c5537845ddd5b1a07291e9db1f1991e45c6e38d211a5c368c1d4",
	name: "loadSamples",
	filename: "src/lib/broker/api.ts"
}, (opts) => loadSamples.__executeServer(opts));
var loadSamples = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(loadSamples_createServerFn_handler, async ({ context }) => {
	const { seedSample } = await import("./hub.server-Dct6fiIS.mjs");
	return seedSample(context.userId);
});
var resetHub_createServerFn_handler = createServerRpc({
	id: "b70c5e01c069fe06496d98eafc9314d850e778bdadffacbb4090916aade35c24",
	name: "resetHub",
	filename: "src/lib/broker/api.ts"
}, (opts) => resetHub.__executeServer(opts));
var resetHub = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(resetHub_createServerFn_handler, async ({ context }) => {
	const { resetWorkspace } = await import("./hub.server-Dct6fiIS.mjs");
	return resetWorkspace(context.userId);
});
var eraseHub_createServerFn_handler = createServerRpc({
	id: "3fe7a02525943630e115371bc338a13d2a160ac5c470d153187618e69fa42fff",
	name: "eraseHub",
	filename: "src/lib/broker/api.ts"
}, (opts) => eraseHub.__executeServer(opts));
var eraseHub = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(eraseHub_createServerFn_handler, async ({ context }) => {
	const { deleteWorkspace } = await import("./hub.server-Dct6fiIS.mjs");
	await deleteWorkspace(context.userId);
	return { ok: true };
});
var lookupProduct_createServerFn_handler = createServerRpc({
	id: "9fd6435149ce6699f90b202ea9bb96d0761cb920cf951a38bfd8bfb40ff48323",
	name: "lookupProduct",
	filename: "src/lib/broker/api.ts"
}, (opts) => lookupProduct.__executeServer(opts));
var lookupProduct = createServerFn({ method: "GET" }).validator(object({ clientId: string().min(8).max(80) })).handler(lookupProduct_createServerFn_handler, async ({ data }) => {
	const { publicProduct } = await import("./hub.server-Dct6fiIS.mjs");
	return publicProduct(data.clientId);
});
var approveConnect_createServerFn_handler = createServerRpc({
	id: "0fac6ac5a87befc9e75492000cbf1ff943cd8744e13f57813ac3c74805149be8",
	name: "approveConnect",
	filename: "src/lib/broker/api.ts"
}, (opts) => approveConnect.__executeServer(opts));
var approveConnect = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	clientId: string(),
	connectionId: string(),
	scopes,
	redirectUri: string().max(300)
})).handler(approveConnect_createServerFn_handler, async ({ context, data }) => {
	const { issueCode } = await import("./hub.server-Dct6fiIS.mjs");
	return issueCode(context.userId, data);
});
var openCheckout_createServerFn_handler = createServerRpc({
	id: "2ce93976a89d541a88418edc5285df18037d52a0feec46e53fbef274e7e42af6",
	name: "openCheckout",
	filename: "src/lib/broker/api.ts"
}, (opts) => openCheckout.__executeServer(opts));
var openCheckout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ plan: _enum([
	"starter",
	"growth",
	"scale"
]) })).handler(openCheckout_createServerFn_handler, async ({ context, data }) => {
	const { appOrigin, startCheckout } = await import("./hub.server-Dct6fiIS.mjs");
	return startCheckout(context.userId, data.plan, appOrigin(await originFromRequest()));
});
var fetchConnectionsForConsent_createServerFn_handler = createServerRpc({
	id: "59fb388bac3a0655489269f8d5fa4194734e054aafb8cd872e8576298f45f4c8",
	name: "fetchConnectionsForConsent",
	filename: "src/lib/broker/api.ts"
}, (opts) => fetchConnectionsForConsent.__executeServer(opts));
var fetchConnectionsForConsent = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(fetchConnectionsForConsent_createServerFn_handler, async ({ context }) => {
	const { getHub } = await import("./hub.server-Dct6fiIS.mjs");
	const hub = await getHub(context.userId);
	return {
		connections: hub.connections,
		products: hub.products
	};
});
//#endregion
export { approveConnect_createServerFn_handler, beginLiveConnect_createServerFn_handler, connectSandboxAccount_createServerFn_handler, disconnectConnection_createServerFn_handler, eraseHub_createServerFn_handler, fetchConnectionsForConsent_createServerFn_handler, fetchHub_createServerFn_handler, hideProductSecret_createServerFn_handler, loadSamples_createServerFn_handler, lookupProduct_createServerFn_handler, openCheckout_createServerFn_handler, registerProduct_createServerFn_handler, removeProduct_createServerFn_handler, resetHub_createServerFn_handler, saveGrant_createServerFn_handler, saveWidget_createServerFn_handler };
