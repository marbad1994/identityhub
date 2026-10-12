import { ApiError } from "./apps-B_TU16ag.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/http-DFBJ3Or7.js
function redirect(location, setCookie) {
	const headers = new Headers({
		location,
		"cache-control": "no-store"
	});
	if (setCookie) headers.append("set-cookie", setCookie);
	return new Response(null, {
		status: 302,
		headers
	});
}
/** Run an app API handler, mapping ApiError to an OAuth-style JSON error. */
async function apiResponse(work) {
	try {
		return Response.json(await work(), { headers: { "cache-control": "no-store" } });
	} catch (error) {
		if (error instanceof ApiError) return Response.json({
			error: error.code,
			error_description: error.message
		}, {
			status: error.status,
			headers: { "cache-control": "no-store" }
		});
		console.error("[api]", error);
		return Response.json({
			error: "server_error",
			error_description: "Unexpected error."
		}, { status: 500 });
	}
}
//#endregion
export { apiResponse, redirect };
