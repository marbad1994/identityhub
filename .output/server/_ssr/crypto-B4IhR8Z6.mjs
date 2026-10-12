import { r as env } from "./db-9EsWRqP0.mjs";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
//#region node_modules/.nitro/vite/services/ssr/assets/crypto-B4IhR8Z6.js
function uid() {
	return randomUUID();
}
function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}
function hashesEqual(left, right) {
	const a = Buffer.from(left);
	const b = Buffer.from(right);
	return a.length === b.length && timingSafeEqual(a, b);
}
function randomToken(prefix) {
	return `${prefix}${randomBytes(32).toString("base64url")}`;
}
function pkcePair() {
	const verifier = randomBytes(48).toString("base64url");
	return {
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url")
	};
}
function encryptionKey() {
	const raw = env("TOKEN_ENCRYPTION_KEY");
	if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
	return createHash("sha256").update(raw).digest();
}
/** AES-256-GCM, encoded as iv.tag.body (base64url). */
function encryptSecret(plain) {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
	const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	return [
		iv,
		cipher.getAuthTag(),
		body
	].map((part) => part.toString("base64url")).join(".");
}
function decryptSecret(payload) {
	const [iv, tag, body] = payload.split(".");
	if (!iv || !tag || !body) throw new Error("Stored token is unreadable");
	const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
	decipher.setAuthTag(Buffer.from(tag, "base64url"));
	return Buffer.concat([decipher.update(Buffer.from(body, "base64url")), decipher.final()]).toString("utf8");
}
function encryptOptional(plain) {
	return plain ? encryptSecret(plain) : null;
}
//#endregion
export { pkcePair as a, uid as c, hashesEqual as i, encryptOptional as n, randomToken as o, encryptSecret as r, sha256 as s, decryptSecret as t };
