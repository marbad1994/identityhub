import { one, rows } from "./db";

export type Limit = { allowed: boolean; retryAfterSeconds: number };

/**
 * Count one event against `key` in a fixed window shared by every server
 * process (it lives in Postgres). Returns whether the event is within `max`.
 */
export async function hit(key: string, max: number, windowSeconds: number): Promise<Limit> {
  const row = await one<{ count: number; window_start: Date }>(
    `insert into rate_limits (key, count, window_start) values ($1, 1, now())
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count, window_start`,
    [key, windowSeconds],
  );
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((row!.window_start.getTime() + windowSeconds * 1000 - Date.now()) / 1000),
  );
  return { allowed: row!.count <= max, retryAfterSeconds };
}

/** Read a counter without adding to it. */
export async function peek(key: string, max: number, windowSeconds: number): Promise<Limit> {
  const row = await one<{ count: number; window_start: Date }>(
    `select count, window_start from rate_limits where key = $1 and window_start >= now() - make_interval(secs => $2)`,
    [key, windowSeconds],
  );
  if (!row) return { allowed: true, retryAfterSeconds: 0 };
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((row.window_start.getTime() + windowSeconds * 1000 - Date.now()) / 1000),
  );
  return { allowed: row.count < max, retryAfterSeconds };
}

export async function clear(key: string): Promise<void> {
  await rows(`delete from rate_limits where key = $1`, [key]);
}
