import { getRequest } from "@tanstack/react-start/server";
import { sessionUser, type SessionUser } from "./session";

/** The signed-in user for the current server-function request. */
export async function currentUser(): Promise<SessionUser | null> {
  return sessionUser(getRequest());
}
