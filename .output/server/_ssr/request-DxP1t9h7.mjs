import { o as getRequest } from "./ssr.mjs";
import { sessionUser } from "./session-BNEWO7BQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/request-DxP1t9h7.js
/** The signed-in user for the current server-function request. */
async function currentUser() {
	return sessionUser(getRequest());
}
//#endregion
export { currentUser };
