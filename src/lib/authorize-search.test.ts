import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultParseSearch, defaultStringifySearch } from "@tanstack/router-core";
import { authorizePath, authorizeSearch } from "./authorize-search.ts";

test("embed and embed_wait stay the number 1 through parse and stringify", () => {
  const parsed = authorizeSearch({
    embed: 1,
    embed_wait: 1,
    client_id: "ihub_pk",
    redirect_uri: "https://app.example/cb",
  });
  assert.equal(parsed.embed, 1);
  assert.equal(parsed.embed_wait, 1);
  assert.equal(typeof parsed.embed, "number");
  assert.equal(typeof parsed.embed_wait, "number");

  const fromQuery = authorizeSearch(
    defaultParseSearch(
      "?embed=1&embed_wait=1&client_id=ihub_pk&redirect_uri=https%3A%2F%2Fapp.example%2Fcb",
    ),
  );
  assert.equal(fromQuery.embed, 1);
  assert.equal(fromQuery.embed_wait, 1);

  const fromStrings = authorizeSearch({
    embed: "1",
    embed_wait: "1",
    client_id: "ihub_pk",
    redirect_uri: "https://app.example/cb",
  });
  assert.equal(fromStrings.embed, 1);
  assert.equal(typeof fromStrings.embed, "number");

  const path = authorizePath(fromStrings);
  assert.match(path, /embed=1/);
  assert.match(path, /embed_wait=1/);
  assert.equal(path.includes("%221%22"), false);

  const query = defaultStringifySearch(fromStrings);
  assert.match(query, /embed=1/);
  assert.match(query, /embed_wait=1/);
  assert.equal(query.includes("%221%22"), false);
});

test("return_to is one encoded parameter and keeps a redirect_uri that contains ? and &", () => {
  const redirectUri = "https://shop.example/cb?x=1&y=2";
  const inner = new URLSearchParams({
    client_id: "ihub_pk_test",
    redirect_uri: redirectUri,
    scope: "profile",
    state: "state-1",
    method: "password",
    relay: "relay-1",
  });
  const next = `/authorize?${inner.toString()}`;
  const outer = new URLSearchParams({
    embed: "1",
    parent_origin: "https://shop.example",
    return_to: next,
  });
  const params = new URLSearchParams(outer.toString());
  const returnTo = params.get("return_to");
  assert.equal(typeof returnTo, "string");
  assert.ok(returnTo?.startsWith("/authorize?"));
  const innerParams = new URLSearchParams(returnTo!.slice(returnTo!.indexOf("?") + 1));
  for (const key of ["client_id", "redirect_uri", "state", "scope", "method", "relay"]) {
    assert.ok(innerParams.get(key), key);
  }
  assert.equal(innerParams.get("redirect_uri"), redirectUri);
  for (const key of ["relay", "state", "method", "redirect_uri"]) {
    assert.equal(params.get(key), null, key);
  }
});
