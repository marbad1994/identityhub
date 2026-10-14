import { rows } from "./db";

const EVERY_MS = 60 * 60 * 1000;
let lastRun = 0;

/**
 * Delete expired sessions, links, challenges and rate-limit counters (whose
 * keys contain IP addresses and emails) at most once an hour per process.
 * Runs in the background; a failure only means it runs again later.
 */
export function housekeeping(): void {
  if (Date.now() - lastRun < EVERY_MS) return;
  lastRun = Date.now();
  void (async () => {
    try {
      await rows(
        `delete from sessions where expires_at < now() or last_seen_at < now() - interval '7 days'`,
      );
      await rows(`delete from email_tokens where expires_at < now() - interval '1 day'`);
      await rows(`delete from login_challenges where expires_at < now()`);
      await rows(`delete from oauth_states where expires_at < now()`);
      await rows(`delete from auth_codes where expires_at < now() - interval '1 day'`);
      await rows(`delete from rate_limits where window_start < now() - interval '1 day'`);
    } catch (error) {
      console.error("[housekeeping]", error instanceof Error ? error.message : error);
    }
  })();
}
