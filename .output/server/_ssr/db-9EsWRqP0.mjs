import { r as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { n as esm_default } from "../_libs/pg.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/db-9EsWRqP0.js
var db_9EsWRqP0_exports = /* @__PURE__ */ __exportAll({
	a: () => appOrigin,
	i: () => tx,
	n: () => one,
	o: () => env,
	r: () => rows,
	s: () => secureCookies,
	t: () => db_exports
});
/** Read an env var, treating empty or whitespace as unset. */
function env(name) {
	const value = process.env[name]?.trim();
	return value ? value : void 0;
}
function requireEnv(name) {
	const value = env(name);
	if (!value) throw new Error(`${name} is not set`);
	return value;
}
/** Public origin of the hub, e.g. https://identity.makketing.com. No trailing slash. */
function appOrigin() {
	return (env("APP_ORIGIN") ?? "http://localhost:8080").replace(/\/+$/, "");
}
/** Session cookies are Secure whenever the hub is served over https. */
function secureCookies() {
	return appOrigin().startsWith("https://");
}
var db_exports = /* @__PURE__ */ __exportAll$1({
	one: () => one,
	rows: () => rows,
	tx: () => tx
});
var globalRef = globalThis;
function pool() {
	globalRef.__ihubPool__ ??= new esm_default.Pool({
		connectionString: requireEnv("DATABASE_URL"),
		max: 10
	});
	return globalRef.__ihubPool__;
}
/** Run one parameterized statement and return its rows. */
async function rows(text, params = [], client = pool()) {
	return (await client.query(text, params)).rows;
}
async function one(text, params = [], client = pool()) {
	return (await rows(text, params, client))[0];
}
/** Run `work` in a single transaction. */
async function tx(work) {
	const client = await pool().connect();
	try {
		await client.query("BEGIN");
		const result = await work(client);
		await client.query("COMMIT");
		return result;
	} catch (error) {
		await client.query("ROLLBACK").catch(() => void 0);
		throw error;
	} finally {
		client.release();
	}
}
//#endregion
export { rows as a, one as i, db_9EsWRqP0_exports as n, secureCookies as o, env as r, tx as s, appOrigin as t };
