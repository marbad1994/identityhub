//#region node_modules/.nitro/vite/services/ssr/assets/platforms-BdWV-H2d.js
/**
* Platform catalogue shared by the browser and the server. Ids match
* SocialPostAPI's platform ids, so a connection handed to a product can be
* used there without translation.
*/
var SCOPES = {
	profile: "Read the account's name, handle and picture",
	publish: "Publish posts and media on the account's behalf"
};
var SCOPE_IDS = Object.keys(SCOPES);
var PLATFORMS = [
	{
		id: "twitter",
		label: "X",
		scopes: ["profile", "publish"]
	},
	{
		id: "instagram",
		label: "Instagram",
		scopes: ["profile", "publish"]
	},
	{
		id: "facebook",
		label: "Facebook",
		scopes: ["profile", "publish"]
	},
	{
		id: "tiktok",
		label: "TikTok",
		scopes: ["profile", "publish"]
	},
	{
		id: "linkedin",
		label: "LinkedIn",
		scopes: ["profile", "publish"]
	},
	{
		id: "youtube",
		label: "YouTube",
		scopes: ["profile", "publish"]
	},
	{
		id: "reddit",
		label: "Reddit",
		scopes: ["profile", "publish"]
	},
	{
		id: "snapchat",
		label: "Snapchat",
		scopes: ["profile"]
	}
];
function platformInfo(id) {
	return PLATFORMS.find((platform) => platform.id === id);
}
function platformLabel(id) {
	return platformInfo(id)?.label ?? id;
}
/** Parse a space- or comma-separated scope string into known hub scopes. */
function parseScopes(value) {
	const out = [];
	for (const part of (value ?? "").split(/[\s,]+/)) if (SCOPE_IDS.includes(part) && !out.includes(part)) out.push(part);
	return out;
}
/** A URL an app may register (homepage or redirect URI): https (or http on localhost), no fragment or credentials. */
function validRedirectUri(value) {
	try {
		const url = new URL(value);
		const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
		if (url.protocol !== "https:" && !(local && url.protocol === "http:")) return false;
		return !url.hash && !url.username && !url.password;
	} catch {
		return false;
	}
}
//#endregion
export { platformLabel as a, platformInfo as i, SCOPES as n, validRedirectUri as o, parseScopes as r, PLATFORMS as t };
