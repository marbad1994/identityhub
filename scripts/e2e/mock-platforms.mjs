/**
 * Test-only: loaded into the hub server process with `node --import` by the
 * E2E run. Answers the platforms' token and profile endpoints so the whole
 * sign-in, connect, consent and token flow runs without real platform apps.
 *
 * The authorization code chooses the person: code "alice" signs in as alice.
 */
const realFetch = globalThis.fetch;
let issued = 0;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** access tokens look like at:<platform>:<person>:<n>, so profile calls know who is asking. */
function token(platform, person) {
  issued += 1;
  return `at:${platform}:${person}:${issued}`;
}

function personFrom(init, url) {
  const auth = new Headers(init?.headers).get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ")
    ? auth.slice(7)
    : (url.searchParams.get("access_token") ?? "");
  return bearer.split(":")[2] ?? "nobody";
}

async function codeFrom(init) {
  const body = init?.body;
  if (body instanceof URLSearchParams) return body.get("code") ?? body.get("refresh_token");
  if (body instanceof FormData) return body.get("code");
  return null;
}

const handlers = {
  "api.twitter.com": async (url, init) => {
    if (url.pathname === "/2/oauth2/token") {
      const body = init.body;
      const person =
        body.get("grant_type") === "refresh_token"
          ? body.get("refresh_token").split(":")[1]
          : body.get("code");
      return json({
        access_token: token("twitter", person),
        refresh_token: `rt:${person}:${issued}`,
        expires_in: 7200,
        scope: "tweet.read tweet.write users.read offline.access media.write",
      });
    }
    const person = personFrom(init, url);
    return json({
      data: {
        id: `tw-${person}`,
        name: `${person} on X`,
        username: person,
        profile_image_url: null,
      },
    });
  },
  "graph.facebook.com": async (url, init) => {
    if (url.pathname.endsWith("/oauth/access_token")) {
      const person =
        url.searchParams.get("code") ?? url.searchParams.get("fb_exchange_token").split(":")[2];
      return json({ access_token: token("facebook", person), expires_in: 5184000 });
    }
    const person = personFrom(init, url);
    if (url.pathname.endsWith("/me/accounts")) {
      return json({
        data: [
          {
            id: `page1-${person}`,
            name: `${person} Bakery`,
            access_token: token("facebook-page", person),
          },
          {
            id: `page2-${person}`,
            name: `${person} Studio`,
            access_token: token("facebook-page", person),
          },
        ],
      });
    }
    return json({ id: `fb-${person}`, name: `${person} on Facebook` });
  },
  "api.instagram.com": async (_url, init) => {
    const person = await codeFrom(init);
    return json({ access_token: token("instagram", person), user_id: `ig-${person}` });
  },
  "graph.instagram.com": async (url, init) => {
    const person = personFrom(init, url);
    if (url.pathname === "/access_token" || url.pathname === "/refresh_access_token") {
      return json({ access_token: token("instagram", person), expires_in: 5184000 });
    }
    return json({ id: `ig-${person}`, username: `${person}.ig` });
  },
  "open.tiktokapis.com": async (url, init) => {
    if (url.pathname.startsWith("/v2/oauth/token")) {
      const person = await codeFrom(init);
      return json({
        access_token: token("tiktok", person),
        refresh_token: `rt:${person}`,
        expires_in: 86400,
        open_id: `tt-${person}`,
        scope: "user.info.basic,video.publish",
      });
    }
    const person = personFrom(init, url);
    return json({ data: { user: { open_id: `tt-${person}`, display_name: `${person} TikTok` } } });
  },
  "www.linkedin.com": async (_url, init) =>
    json({ access_token: token("linkedin", await codeFrom(init)), expires_in: 5184000 }),
  "api.linkedin.com": async (url, init) => {
    const person = personFrom(init, url);
    return json({ sub: `li-${person}`, name: `${person} LinkedIn` });
  },
  "oauth2.googleapis.com": async (_url, init) =>
    json({
      access_token: token("youtube", await codeFrom(init)),
      refresh_token: "rt",
      expires_in: 3600,
    }),
  "www.googleapis.com": async (url, init) => {
    const person = personFrom(init, url);
    return json({
      items: [
        { id: `yt-${person}`, snippet: { title: `${person} Channel`, customUrl: `@${person}` } },
      ],
    });
  },
  "www.reddit.com": async (_url, init) =>
    json({
      access_token: token("reddit", await codeFrom(init)),
      refresh_token: "rt",
      expires_in: 3600,
    }),
  "oauth.reddit.com": async (url, init) => {
    const person = personFrom(init, url);
    return json({ id: `rd-${person}`, name: person });
  },
  "accounts.snapchat.com": async (_url, init) =>
    json({
      access_token: token("snapchat", await codeFrom(init)),
      refresh_token: "rt",
      expires_in: 3600,
    }),
  "kit.snapchat.com": async (url, init) => {
    const person = personFrom(init, url);
    return json({
      data: {
        me: {
          externalId: `sc-${person}`,
          displayName: `${person} Snap`,
          bitmoji: { avatar: null },
        },
      },
    });
  },
};

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  const handler = handlers[url.host];
  return handler ? handler(url, init) : realFetch(input, init);
};
