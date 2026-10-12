//#region node_modules/.nitro/vite/services/ssr/assets/hub-Bm3YMrkJ.js
var SCOPE_LABEL = {
	profile: "Profile",
	media: "Media",
	publish: "Publish",
	analytics: "Analytics"
};
var PROVIDERS = [
	{
		id: "x",
		name: "X",
		scopes: [
			"profile",
			"publish",
			"analytics"
		],
		blurb: "Posts and profile"
	},
	{
		id: "instagram",
		name: "Instagram",
		scopes: [
			"profile",
			"media",
			"publish"
		],
		blurb: "Feed, reels, media"
	},
	{
		id: "facebook",
		name: "Facebook",
		scopes: [
			"profile",
			"publish",
			"analytics"
		],
		blurb: "Pages and posts"
	},
	{
		id: "tiktok",
		name: "TikTok",
		scopes: [
			"profile",
			"publish",
			"analytics"
		],
		blurb: "Short video"
	},
	{
		id: "linkedin",
		name: "LinkedIn",
		scopes: ["profile", "publish"],
		blurb: "Profile and posts"
	},
	{
		id: "youtube",
		name: "YouTube",
		scopes: [
			"profile",
			"media",
			"analytics"
		],
		blurb: "Channel and video"
	},
	{
		id: "reddit",
		name: "Reddit",
		scopes: ["profile", "publish"],
		blurb: "Profile and posts"
	}
];
new Set(PROVIDERS.map((p) => p.id));
function providerById(id) {
	return PROVIDERS.find((p) => p.id === id);
}
function initialWidget() {
	return {
		name: "Your app",
		theme: "light",
		providers: PROVIDERS.map((p) => p.id)
	};
}
function validOrigin(value) {
	try {
		const url = new URL(value.trim());
		return url.protocol === "https:" && url.username === "" && url.password === "" && url.pathname === "/" && url.search === "" && url.hash === "";
	} catch {
		return false;
	}
}
function normalizeHandle(raw) {
	let handle = raw.trim();
	if (!handle) return null;
	if (!handle.startsWith("@")) handle = `@${handle}`;
	if (!/^@[A-Za-z0-9._]{2,30}$/.test(handle)) return null;
	return handle;
}
//#endregion
export { providerById as a, normalizeHandle as i, SCOPE_LABEL as n, validOrigin as o, initialWidget as r, PROVIDERS as t };
