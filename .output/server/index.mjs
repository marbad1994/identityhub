globalThis.__nitro_main__ = import.meta.url;
import { a as toEventHandler, c as serve, i as defineLazyEventHandler, n as HTTPError, r as defineHandler, s as NodeResponse, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { i as withoutTrailingSlash, n as joinURL, r as withLeadingSlash, t as decodePath } from "./_libs/ufo.mjs";
import { promises } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/favicon.svg": {
		"type": "image/svg+xml",
		"etag": "\"1bc-mssukyssrUftVWrhfR1foendBqA\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 444,
		"path": "../public/favicon.svg"
	},
	"/og.jpg": {
		"type": "image/jpeg",
		"etag": "\"b85b-mC7oSldIhZrN7kSSFPIjudMvjio\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 47195,
		"path": "../public/og.jpg"
	},
	"/identity-hub-widget.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19ad-6419V9k4Ypdfw0mEooxbwqaEr1k\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 6573,
		"path": "../public/identity-hub-widget.js"
	},
	"/__grok/icon-180.png": {
		"type": "image/png",
		"etag": "\"834-Xk8vfS0DTFn7ggtkfEduWTcNWGE\"",
		"mtime": "2026-10-12T07:17:14.325Z",
		"size": 2100,
		"path": "../public/__grok/icon-180.png"
	},
	"/assets/api-mUkYtTYj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5f0-PvcomEFWtR9OzJktgKOvzNg54oQ\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 1520,
		"path": "../public/assets/api-mUkYtTYj.js"
	},
	"/assets/authorize-CCqHXrfl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ff6-jD+M/mO+h8QR6l6sxjGX31+uK/8\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 4086,
		"path": "../public/assets/authorize-CCqHXrfl.js"
	},
	"/assets/client-CPO9_K2u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7dd5-O+FAz0b7hLT+JskO629AjBojrOw\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 32213,
		"path": "../public/assets/client-CPO9_K2u.js"
	},
	"/assets/connect-ClMNo6JW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"df5-lkRjkwdVMSAfUjivJSS1DXRLibw\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 3573,
		"path": "../public/assets/connect-ClMNo6JW.js"
	},
	"/assets/createLucideIcon-bnF0-E5Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"344e-9L1IHCzkrIN6LFD5XRq0dsFvOP0\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 13390,
		"path": "../public/assets/createLucideIcon-bnF0-E5Z.js"
	},
	"/assets/deletion-B5AZOR2I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b2-HpXhyL7oFmqa2Wva5DpJbZlvNeM\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 1458,
		"path": "../public/assets/deletion-B5AZOR2I.js"
	},
	"/assets/demo-2CmH8kNX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c42-zeV/z06aiRG2vIr963MuYWcYals\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 3138,
		"path": "../public/assets/demo-2CmH8kNX.js"
	},
	"/assets/docs-C2cRt20k.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1340-nUg5A7Ko/xz/2p9bQ1MnPDxzT6Y\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 4928,
		"path": "../public/assets/docs-C2cRt20k.js"
	},
	"/assets/hub-CPwKH1PT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34a-8sKEcRwZFyQbOJmBIqobL2OwSUY\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 842,
		"path": "../public/assets/hub-CPwKH1PT.js"
	},
	"/assets/lazyRouteComponent-D0AkibFO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e60-VB1kqCzR6b4j39NNc+fX6ctr09I\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 3680,
		"path": "../public/assets/lazyRouteComponent-D0AkibFO.js"
	},
	"/assets/login-jVn8ZSLQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"359-g6IdqkbRf5IGkgL6Fvs6xRW6Abg\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 857,
		"path": "../public/assets/login-jVn8ZSLQ.js"
	},
	"/assets/platform-buttons-B8tYlnpQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2eb-SYsRm+pigt86q5gCczxb84Y0/rc\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 747,
		"path": "../public/assets/platform-buttons-B8tYlnpQ.js"
	},
	"/assets/platforms-JFmO_gRX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2c5-P/0w5on82VNGKqJq3Gp2OAnUHDM\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 709,
		"path": "../public/assets/platforms-JFmO_gRX.js"
	},
	"/assets/preload-helper-BLdHbfdN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5ef-Il+yCunPAyR+2RrWvue0GrVQy8k\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 1519,
		"path": "../public/assets/preload-helper-BLdHbfdN.js"
	},
	"/assets/pricing-D9egANqv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cf5-afjN5m6xbRPPrttBqq1Ggk4Ez9Q\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 3317,
		"path": "../public/assets/pricing-D9egANqv.js"
	},
	"/assets/privacy-DRhXKu9i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4cb-FL+v0ETUdE7L6Zf2UOs4mVS2lCk\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 1227,
		"path": "../public/assets/privacy-DRhXKu9i.js"
	},
	"/assets/index-BoBwcw_8.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"46253-b6cC1wAzEo2UECDBvCr0TrpOehY\"",
		"mtime": "2026-10-12T07:17:13.685Z",
		"size": 287315,
		"path": "../public/assets/index-BoBwcw_8.js"
	},
	"/assets/react-DB-4Zxce.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2151-Ol/sUJOJ5lAOEXgpry7Qo8Yxyv4\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 8529,
		"path": "../public/assets/react-DB-4Zxce.js"
	},
	"/assets/redirect-DmtLUW0N.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"184-TRM49T5nvIhX8okm9YKQe/jdlzE\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 388,
		"path": "../public/assets/redirect-DmtLUW0N.js"
	},
	"/assets/routes-D-PvasJz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"871-CtI0sz/CJHLo8iIE545XaL3PZ1E\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 2161,
		"path": "../public/assets/routes-D-PvasJz.js"
	},
	"/assets/createMiddleware-MHYVMQdo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9220-3+hmApo0u4jmoyF2Xj8FVI3bDsc\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 37408,
		"path": "../public/assets/createMiddleware-MHYVMQdo.js"
	},
	"/assets/shell-C0vowd1-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19db-oChTguRAddXPSAvKObeHTJegOug\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 6619,
		"path": "../public/assets/shell-C0vowd1-.js"
	},
	"/assets/terms-BA4dI7Jn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e3-7vYrHEgS969hpNRLOQG2faTTVfQ\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 995,
		"path": "../public/assets/terms-BA4dI7Jn.js"
	},
	"/assets/use-current-user-DIF6E26U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"adf-wLxGD6r/0lAzezKhk4OAunvobQw\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 2783,
		"path": "../public/assets/use-current-user-DIF6E26U.js"
	},
	"/assets/workspace-Doopl5pQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2817-76zIids/qhovCXHz1erZcDgSn7I\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 10263,
		"path": "../public/assets/workspace-Doopl5pQ.js"
	},
	"/__grok/install/styles.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1a3d-VUsWOMAheo1/P30EqU5qaIkyvIQ\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 6717,
		"path": "../public/__grok/install/styles.css"
	},
	"/__grok/install/assets/homescreen/glass-puzzle.svg": {
		"type": "image/svg+xml",
		"etag": "\"713-AP2wG8KChAGjse1Fn+f/+vDN+sQ\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 1811,
		"path": "../public/__grok/install/assets/homescreen/glass-puzzle.svg"
	},
	"/__grok/install/assets/homescreen/glass-share.svg": {
		"type": "image/svg+xml",
		"etag": "\"954-jb3ATcKjqgMOYrA/4w1v21j0Jvg\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 2388,
		"path": "../public/__grok/install/assets/homescreen/glass-share.svg"
	},
	"/__grok/install/assets/homescreen/logo-grok.svg": {
		"type": "image/svg+xml",
		"etag": "\"423-5mXO+yh9KW40jM3to5JlWPhxNK8\"",
		"mtime": "2026-10-12T07:17:14.326Z",
		"size": 1059,
		"path": "../public/__grok/install/assets/homescreen/logo-grok.svg"
	},
	"/__grok/install/assets/homescreen/ob-ipad.png": {
		"type": "image/png",
		"etag": "\"18dd3-wlRwrpmBImStuiu+4poVz7ANin4\"",
		"mtime": "2026-10-12T07:17:14.327Z",
		"size": 101843,
		"path": "../public/__grok/install/assets/homescreen/ob-ipad.png"
	},
	"/__grok/install/assets/homescreen/plus.svg": {
		"type": "image/svg+xml",
		"etag": "\"961-sSBPunx/13vbMNAlPxb7UeO3l3A\"",
		"mtime": "2026-10-12T07:17:14.327Z",
		"size": 2401,
		"path": "../public/__grok/install/assets/homescreen/plus.svg"
	},
	"/__grok/install/assets/homescreen/ob-phone.png": {
		"type": "image/png",
		"etag": "\"194bc-oZradWHIHO68q2glHU0Gk5ttpWA\"",
		"mtime": "2026-10-12T07:17:14.327Z",
		"size": 103612,
		"path": "../public/__grok/install/assets/homescreen/ob-phone.png"
	},
	"/assets/styles-BgSWyKSA.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"51e5-r7sqVUvM8jQaKL9IYZGk4xfEwk8\"",
		"mtime": "2026-10-12T07:17:13.692Z",
		"size": 20965,
		"path": "../public/assets/styles-BgSWyKSA.css"
	}
};
//#endregion
//#region #nitro/virtual/public-assets-node
function readAsset(id) {
	const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
	return promises.readFile(resolve(serverDir, public_assets_data_default[id].path));
}
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
function getAsset(id) {
	return public_assets_data_default[id];
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/static.mjs
var METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
var EncodingMap = {
	gzip: ".gz",
	br: ".br",
	zstd: ".zst"
};
var static_default = defineHandler((event) => {
	if (event.req.method && !METHODS.has(event.req.method)) return;
	let id = decodePath(withLeadingSlash(withoutTrailingSlash(event.url.pathname)));
	let asset;
	const encodings = [...(event.req.headers.get("accept-encoding") || "").split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(), ""];
	for (const encoding of encodings) for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
		const _asset = getAsset(_id);
		if (_asset) {
			asset = _asset;
			id = _id;
			break;
		}
	}
	if (!asset) {
		if (isPublicAssetURL(id)) {
			event.res.headers.delete("Cache-Control");
			throw new HTTPError({ status: 404 });
		}
		return;
	}
	if (encodings.length > 1) event.res.headers.append("Vary", "Accept-Encoding");
	if (event.req.headers.get("if-none-match") === asset.etag) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	const ifModifiedSinceH = event.req.headers.get("if-modified-since");
	const mtimeDate = new Date(asset.mtime);
	if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
		event.res.status = 304;
		event.res.statusText = "Not Modified";
		return "";
	}
	if (asset.type) event.res.headers.set("Content-Type", asset.type);
	if (asset.etag && !event.res.headers.has("ETag")) event.res.headers.set("ETag", asset.etag);
	if (asset.mtime && !event.res.headers.has("Last-Modified")) event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
	if (asset.encoding && !event.res.headers.has("Content-Encoding")) event.res.headers.set("Content-Encoding", asset.encoding);
	if (asset.size > 0 && !event.res.headers.has("Content-Length")) event.res.headers.set("Content-Length", asset.size.toString());
	return readAsset(id);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_yuNRKt = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_yuNRKt
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
var globalMiddleware = [toEventHandler(static_default)].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new NodeResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~middleware"].push(...globalMiddleware);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		middleware.push(...h3App["~middleware"]);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/hooks.mjs
function _captureError(error, type) {
	console.error(`[${type}]`, error);
	useNitroApp().captureError?.(error, { tags: [type] });
}
function trapUnhandledErrors() {
	process.on("unhandledRejection", (error) => _captureError(error, "unhandledRejection"));
	process.on("uncaughtException", (error) => _captureError(error, "uncaughtException"));
}
//#endregion
//#region #nitro/virtual/tracing
var tracingSrvxPlugins = [];
//#endregion
//#region node_modules/nitro/dist/presets/node/runtime/node-server.mjs
var _parsedPort = Number.parseInt(process.env.NITRO_PORT ?? process.env.PORT ?? "");
var port = Number.isNaN(_parsedPort) ? 3e3 : _parsedPort;
var host = process.env.NITRO_HOST || process.env.HOST;
var cert = process.env.NITRO_SSL_CERT;
var key = process.env.NITRO_SSL_KEY;
var nitroApp = useNitroApp();
serve({
	port,
	hostname: host,
	tls: cert && key ? {
		cert,
		key
	} : void 0,
	fetch: nitroApp.fetch,
	plugins: [...tracingSrvxPlugins]
});
trapUnhandledErrors();
var node_server_default = {};
//#endregion
export { node_server_default as default };
