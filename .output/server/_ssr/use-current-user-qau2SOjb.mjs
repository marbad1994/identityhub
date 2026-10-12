import { o as __toESM } from "../_runtime.mjs";
import { Z as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as authMiddleware } from "./middleware-CuQiLuJ2.mjs";
import { cn as _enum, hn as object, un as array, vn as string } from "../_libs/@better-auth/core+[...].mjs";
import { t as createSsrRpc } from "./createSsrRpc-B2Izd0c7.mjs";
import { t as authClient } from "./client-DHCqFwj5.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-current-user-qau2SOjb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var scopes = array(string()).max(8);
var fetchHub = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("7c38ead7e1de22cbe8879ddf046fed658a799007813e284ddf076e7e454dbd3f"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	provider: string(),
	handle: string().max(40),
	displayName: string().max(60),
	scopes
})).handler(createSsrRpc("f14fad61a218c44f8a9cfef09ba374f280e31dcdecaff5d330ec984519e4b921"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	provider: string(),
	scopes
})).handler(createSsrRpc("0061d074e1870765af606a856447371e6516b9aaa191be6894a2a7ab487b9512"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ connectionId: string() })).handler(createSsrRpc("bb59b69cf9d9fcb0fece84d638c1299d76ccfda56172d0445d982531b48a845b"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	name: string().max(48),
	origin: string().max(200),
	description: string().max(140)
})).handler(createSsrRpc("a5595ad3fbbf2944231c0bd4723bbf3bcb65f40b8e480b651db563cb4c37f04a"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ productId: string() })).handler(createSsrRpc("02922ae88fa0dff148c14e20b45af347e6955b4fb557efa294f557dcd3a42ad3"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ productId: string() })).handler(createSsrRpc("dfc7ccb2a25d5447721e206057a1c29463c990c8b4a0327c9cf2b67cecc61d30"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	productId: string(),
	connectionId: string(),
	scopes
})).handler(createSsrRpc("9c60ed6aa56174fe77f24c2053088a160b37ebcccf49b440f8bee740aefbb0d5"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	name: string().max(40),
	theme: string(),
	providers: array(string()).max(8)
})).handler(createSsrRpc("b81209195eb0f1613f253ef72c46c8868956aaced0a311bd82fb55c83fa6a123"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("9f9609100180c5537845ddd5b1a07291e9db1f1991e45c6e38d211a5c368c1d4"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("b70c5e01c069fe06496d98eafc9314d850e778bdadffacbb4090916aade35c24"));
createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("3fe7a02525943630e115371bc338a13d2a160ac5c470d153187618e69fa42fff"));
var lookupProduct = createServerFn({ method: "GET" }).validator(object({ clientId: string().min(8).max(80) })).handler(createSsrRpc("9fd6435149ce6699f90b202ea9bb96d0761cb920cf951a38bfd8bfb40ff48323"));
var approveConnect = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({
	clientId: string(),
	connectionId: string(),
	scopes,
	redirectUri: string().max(300)
})).handler(createSsrRpc("0fac6ac5a87befc9e75492000cbf1ff943cd8744e13f57813ac3c74805149be8"));
var openCheckout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator(object({ plan: _enum([
	"starter",
	"growth",
	"scale"
]) })).handler(createSsrRpc("2ce93976a89d541a88418edc5285df18037d52a0feec46e53fbef274e7e42af6"));
var fetchConnectionsForConsent = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("59fb388bac3a0655489269f8d5fa4194734e054aafb8cd872e8576298f45f4c8"));
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	return useSessionUserState();
}
function useSessionUserState() {
	const { data, isPending } = authClient.useSession();
	const id = data?.user.id;
	const displayName = data?.user.name ?? null;
	const primaryEmail = data?.user.email ?? null;
	const profileImageUrl = data?.user.image ?? null;
	const user = (0, import_react.useMemo)(() => id ? {
		id,
		displayName,
		primaryEmail,
		profileImageUrl,
		isDevFallback: false
	} : null, [
		id,
		displayName,
		primaryEmail,
		profileImageUrl
	]);
	return (0, import_react.useMemo)(() => ({
		user,
		isPending
	}), [user, isPending]);
}
//#endregion
export { openCheckout as a, lookupProduct as i, fetchConnectionsForConsent as n, useCurrentUserState as o, fetchHub as r, approveConnect as t };
