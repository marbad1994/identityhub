/** Search flags shared by /authorize and the framed credential pages. */

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

/**
 * `defaultParseSearch` turns the query `embed=1` into the number 1 before
 * validateSearch runs. Returning that number keeps stringifySearch from
 * writing embed=%221%22.
 */
export function embedFlag(value: unknown): 1 | undefined {
  return value === "1" || value === 1 ? 1 : undefined;
}

export type AuthorizeSearch = {
  client_id: string;
  redirect_uri: string;
  state?: string;
  scope?: string;
  method?: string;
  relay?: string;
  embed?: 1;
  embed_wait?: 1;
  parent_origin?: string;
};

export function authorizeSearch(search: Record<string, unknown>): AuthorizeSearch {
  return {
    client_id: text(search.client_id) ?? "",
    redirect_uri: text(search.redirect_uri) ?? "",
    state: text(search.state),
    scope: text(search.scope),
    method: text(search.method),
    relay: text(search.relay),
    embed: embedFlag(search.embed),
    embed_wait: embedFlag(search.embed_wait),
    parent_origin: text(search.parent_origin),
  };
}

/** Rebuild /authorize from the validated object. Numbers stringify as `embed=1`. */
export function authorizePath(search: Partial<AuthorizeSearch>): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "") return;
    params.set(key, String(value));
  };
  set("client_id", search.client_id);
  set("redirect_uri", search.redirect_uri);
  set("state", search.state);
  set("scope", search.scope);
  set("method", search.method);
  set("relay", search.relay);
  set("embed", search.embed);
  set("embed_wait", search.embed_wait);
  set("parent_origin", search.parent_origin);
  return `/authorize?${params.toString()}`;
}

export function credentialFlags(search: Record<string, unknown>): {
  return_to?: string;
  embed?: 1;
  parent_origin?: string;
  embed_wait?: 1;
} {
  return {
    return_to: text(search.return_to),
    embed: embedFlag(search.embed),
    parent_origin: text(search.parent_origin),
    embed_wait: embedFlag(search.embed_wait),
  };
}
