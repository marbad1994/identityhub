import { one, rows } from "./db";
import { sha256 } from "./crypto";

const RELAY_MINUTES = 15;

/** 32 random bytes, base64url, made by the browser that opens the popup. */
export function validRelay(id: string | null | undefined): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{43}$/.test(id);
}

export function relayHash(id: string): string {
  return sha256(`relay:${id}`);
}

/** Record where the opener should go once the popup is done. */
export async function completeRelay(hash: string, location: string): Promise<void> {
  await rows(
    `insert into auth_relays (relay_hash, location, expires_at) values ($1, $2, now() + make_interval(mins => $3))
     on conflict (relay_hash) do update set location = excluded.location, expires_at = excluded.expires_at`,
    [hash, location, RELAY_MINUTES],
  );
}

/** The stored location, deleted as it is read; null while the popup is still going. */
export async function takeRelay(id: string): Promise<string | null> {
  const row = await one<{ location: string }>(
    `delete from auth_relays where relay_hash = $1 and expires_at > now() returning location`,
    [relayHash(id)],
  );
  return row?.location ?? null;
}
