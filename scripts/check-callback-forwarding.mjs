import { pathToFileURL } from "node:url";

/** Probe forwarding without a real authorization code or a user's login. */
export async function checkCallbackForwarding(origin, callbackBase, fetcher = fetch) {
  for (const platform of ["twitter", "tiktok"]) {
    for (const result of [{ code: "identityhub-forwarding-check" }, { error: "access_denied" }]) {
      const query = new URLSearchParams({ state: "ihub_st_forwarding_check", ...result });
      const url = `${callbackBase.replace(/\/+$/, "")}/${platform}/callback?${query}`;
      const response = await fetcher(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      const location = response.headers.get("location");
      const expected = new URL(`/api/auth/callback/${platform}?${query}`, origin).href;
      if (
        ![302, 303, 307, 308].includes(response.status) ||
        !location ||
        new URL(location, url).href !== expected
      ) {
        throw new Error(
          `${platform} callback is not forwarding to ${new URL(origin).origin}. ` +
            "Set IDENTITY_HUB_URL to IdentityHub's APP_ORIGIN in SocialPostAPI's .env, " +
            "deploy the version with IdentityHub callback forwarding, and recreate its API containers.",
        );
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { APP_ORIGIN, PLATFORM_CALLBACK_BASE } = process.env;
  if (!PLATFORM_CALLBACK_BASE) {
    console.log("Direct platform callbacks configured; no forwarding needed.");
  } else if (!APP_ORIGIN) {
    console.error("APP_ORIGIN must be set.");
    process.exitCode = 1;
  } else {
    try {
      await checkCallbackForwarding(APP_ORIGIN, PLATFORM_CALLBACK_BASE);
      console.log("SocialPostAPI forwards IdentityHub callbacks and provider errors correctly.");
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  }
}
