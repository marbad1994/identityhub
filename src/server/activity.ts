import { rows, type Queryable } from "./db";
import { uid } from "./crypto";

export async function logActivity(
  userId: string,
  action: string,
  detail: string,
  client?: Queryable,
) {
  await rows(
    `insert into activity (id, user_id, action, detail) values ($1, $2, $3, $4)`,
    [uid(), userId, action.slice(0, 80), detail.slice(0, 300)],
    client,
  );
}
