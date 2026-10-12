export const SCOPE_LABEL = {
  profile: "Profile",
  media: "Media",
  publish: "Publish",
  analytics: "Analytics",
} as const;

export type ScopeId = keyof typeof SCOPE_LABEL;

export type ProviderId =
  | "x"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "reddit";

export type ProviderDef = {
  id: ProviderId;
  name: string;
  scopes: ScopeId[];
  blurb: string;
};

export const PROVIDERS: ProviderDef[] = [
  {
    id: "x",
    name: "X",
    scopes: ["profile", "publish", "analytics"],
    blurb: "Posts and profile",
  },
  {
    id: "instagram",
    name: "Instagram",
    scopes: ["profile", "media", "publish"],
    blurb: "Feed, reels, media",
  },
  {
    id: "facebook",
    name: "Facebook",
    scopes: ["profile", "publish", "analytics"],
    blurb: "Pages and posts",
  },
  {
    id: "tiktok",
    name: "TikTok",
    scopes: ["profile", "publish", "analytics"],
    blurb: "Short video",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    scopes: ["profile", "publish"],
    blurb: "Profile and posts",
  },
  {
    id: "youtube",
    name: "YouTube",
    scopes: ["profile", "media", "analytics"],
    blurb: "Channel and video",
  },
  {
    id: "reddit",
    name: "Reddit",
    scopes: ["profile", "publish"],
    blurb: "Profile and posts",
  },
];

export const PLANNED = [
  {
    id: "snapchat",
    name: "Snapchat",
    note: "Planned · identity only, not a connector",
  },
] as const;

export type Connection = {
  id: string;
  provider: ProviderId;
  handle: string;
  displayName: string;
  scopes: ScopeId[];
  connectedAt: string;
};

export type Product = {
  id: string;
  name: string;
  origin: string;
  description: string;
  createdAt: string;
};

export type Grant = {
  id: string;
  productId: string;
  connectionId: string;
  scopes: ScopeId[];
  grantedAt: string;
};

export type Activity = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type WidgetConfig = {
  name: string;
  theme: "light" | "dark";
  providers: ProviderId[];
};

export type Hub = {
  connections: Connection[];
  products: Product[];
  grants: Grant[];
  events: Activity[];
  widget: WidgetConfig;
};

export type Result = { ok: true; hub: Hub } | { ok: false; error: string };

const MAX_EVENTS = 200;
const MAX_CONNECTIONS = 40;
const MAX_PRODUCTS = 24;

const PROVIDER_IDS = new Set<string>(PROVIDERS.map((p) => p.id));

export function providerById(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function scopeLabel(id: ScopeId): string {
  return SCOPE_LABEL[id];
}

function uid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function isScope(value: unknown): value is ScopeId {
  return typeof value === "string" && value in SCOPE_LABEL;
}

function isProvider(value: unknown): value is ProviderId {
  return typeof value === "string" && PROVIDER_IDS.has(value);
}

function cleanScopes(values: unknown, allowed: readonly ScopeId[]): ScopeId[] {
  if (!Array.isArray(values)) return [];
  const allow = new Set(allowed);
  const out: ScopeId[] = [];
  for (const value of values) {
    if (isScope(value) && allow.has(value) && !out.includes(value)) out.push(value);
  }
  return out;
}

function log(hub: Hub, action: string, detail: string): Hub {
  const events = [{ id: uid(), at: now(), action, detail }, ...hub.events].slice(0, MAX_EVENTS);
  return { ...hub, events };
}

export function initialWidget(): WidgetConfig {
  return {
    name: "Your app",
    theme: "light",
    providers: PROVIDERS.map((p) => p.id),
  };
}

export function initialHub(): Hub {
  const createdAt = "2026-10-12T00:00:00.000Z";
  return {
    connections: [],
    products: [
      {
        id: "socialpostapi",
        name: "SocialPostAPI",
        origin: "https://socialpostapi.makketing.com",
        description: "Multi-platform social publishing",
        createdAt,
      },
      {
        id: "makketing",
        name: "Makketing",
        origin: "https://makketing.com",
        description: "Shared platform workspace",
        createdAt,
      },
    ],
    grants: [],
    events: [],
    widget: initialWidget(),
  };
}

export function validOrigin(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

export function normalizeHandle(raw: string): string | null {
  let handle = raw.trim();
  if (!handle) return null;
  if (!handle.startsWith("@")) handle = `@${handle}`;
  if (!/^@[A-Za-z0-9._]{2,30}$/.test(handle)) return null;
  return handle;
}

export function normalizeHub(value: unknown): Hub {
  const base = initialHub();
  if (!value || typeof value !== "object") return base;
  const raw = value as Partial<Hub>;

  const connections: Connection[] = [];
  if (Array.isArray(raw.connections)) {
    for (const item of raw.connections) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<Connection>;
      if (typeof row.id !== "string" || !isProvider(row.provider)) continue;
      const provider = providerById(row.provider);
      if (!provider) continue;
      const handle = typeof row.handle === "string" ? normalizeHandle(row.handle) : null;
      const displayName = typeof row.displayName === "string" ? row.displayName.trim().slice(0, 60) : "";
      if (!handle || displayName.length < 2) continue;
      const duplicate = connections.some(
        (c) => c.provider === row.provider && c.handle.toLowerCase() === handle.toLowerCase(),
      );
      if (duplicate) continue;
      connections.push({
        id: row.id,
        provider: row.provider,
        handle,
        displayName,
        scopes: cleanScopes(row.scopes, provider.scopes),
        connectedAt: typeof row.connectedAt === "string" ? row.connectedAt : now(),
      });
      if (connections.length >= MAX_CONNECTIONS) break;
    }
  }

  const products: Product[] = [];
  if (Array.isArray(raw.products)) {
    for (const item of raw.products) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<Product>;
      const origin = typeof row.origin === "string" ? row.origin.trim() : "";
      if (typeof row.id !== "string" || typeof row.name !== "string" || !validOrigin(origin)) continue;
      const name = row.name.trim().slice(0, 48);
      if (name.length < 2) continue;
      if (products.some((p) => p.id === row.id || p.origin === origin)) continue;
      products.push({
        id: row.id,
        name,
        origin,
        description: typeof row.description === "string" ? row.description.trim().slice(0, 140) : "",
        createdAt: typeof row.createdAt === "string" ? row.createdAt : now(),
      });
      if (products.length >= MAX_PRODUCTS) break;
    }
  }

  const connectionIds = new Set(connections.map((c) => c.id));
  const productIds = new Set(products.map((p) => p.id));
  const grants: Grant[] = [];
  if (Array.isArray(raw.grants)) {
    for (const item of raw.grants) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<Grant>;
      if (typeof row.id !== "string" || typeof row.productId !== "string" || typeof row.connectionId !== "string") {
        continue;
      }
      if (!productIds.has(row.productId) || !connectionIds.has(row.connectionId)) continue;
      const connection = connections.find((c) => c.id === row.connectionId);
      if (!connection) continue;
      const scopes = cleanScopes(row.scopes, connection.scopes);
      if (scopes.length === 0) continue;
      if (grants.some((g) => g.productId === row.productId && g.connectionId === row.connectionId)) continue;
      grants.push({
        id: row.id,
        productId: row.productId,
        connectionId: row.connectionId,
        scopes,
        grantedAt: typeof row.grantedAt === "string" ? row.grantedAt : now(),
      });
    }
  }

  const events: Activity[] = [];
  if (Array.isArray(raw.events)) {
    for (const item of raw.events) {
      if (!item || typeof item !== "object") continue;
      const row = item as Partial<Activity>;
      if (typeof row.id !== "string" || typeof row.action !== "string") continue;
      events.push({
        id: row.id,
        at: typeof row.at === "string" ? row.at : now(),
        action: row.action.slice(0, 80),
        detail: typeof row.detail === "string" ? row.detail.slice(0, 240) : "",
      });
      if (events.length >= MAX_EVENTS) break;
    }
  }

  const widgetRaw = raw.widget;
  const widget: WidgetConfig = initialWidget();
  if (widgetRaw && typeof widgetRaw === "object") {
    const w = widgetRaw as Partial<WidgetConfig>;
    if (typeof w.name === "string" && w.name.trim().length > 0) widget.name = w.name.trim().slice(0, 40);
    if (w.theme === "dark" || w.theme === "light") widget.theme = w.theme;
    if (Array.isArray(w.providers)) {
      const providers = w.providers.filter(isProvider);
      if (providers.length > 0) widget.providers = [...new Set(providers)];
    }
  }

  return {
    connections,
    products: products.length > 0 ? products : base.products,
    grants,
    events,
    widget,
  };
}

export function connectAccount(
  hub: Hub,
  input: { provider: string; handle: string; displayName: string; scopes: string[] },
): Result {
  const provider = providerById(input.provider);
  if (!provider) return { ok: false, error: "That platform is not available in this sandbox." };
  if (hub.connections.length >= MAX_CONNECTIONS) {
    return { ok: false, error: "This workspace already has the maximum number of connections." };
  }
  const handle = normalizeHandle(input.handle);
  if (!handle) {
    return { ok: false, error: "Use a handle like @studio — letters, numbers, dots, and underscores." };
  }
  const displayName = input.displayName.trim().slice(0, 60);
  if (displayName.length < 2) return { ok: false, error: "Add a display name." };
  const duplicate = hub.connections.some(
    (c) => c.provider === provider.id && c.handle.toLowerCase() === handle.toLowerCase(),
  );
  if (duplicate) return { ok: false, error: `${handle} is already connected on ${provider.name}.` };
  const scopes = cleanScopes(input.scopes, provider.scopes);
  if (scopes.length === 0) return { ok: false, error: "Choose at least one scope this account allows." };
  const connection: Connection = {
    id: uid(),
    provider: provider.id,
    handle,
    displayName,
    scopes,
    connectedAt: now(),
  };
  const next = log(
    { ...hub, connections: [connection, ...hub.connections] },
    "Connected",
    `Sandbox profile ${handle} on ${provider.name}. No provider was contacted.`,
  );
  return { ok: true, hub: next };
}

export function disconnectAccount(hub: Hub, connectionId: string): Result {
  const connection = hub.connections.find((c) => c.id === connectionId);
  if (!connection) return { ok: false, error: "That connection is no longer in this workspace." };
  const provider = providerById(connection.provider);
  const removed = hub.grants.filter((g) => g.connectionId === connectionId).length;
  const next = log(
    {
      ...hub,
      connections: hub.connections.filter((c) => c.id !== connectionId),
      grants: hub.grants.filter((g) => g.connectionId !== connectionId),
    },
    "Disconnected",
    `${connection.handle} on ${provider?.name ?? connection.provider} removed, along with ${removed} grant${removed === 1 ? "" : "s"}.`,
  );
  return { ok: true, hub: next };
}

export function addProduct(
  hub: Hub,
  input: { name: string; origin: string; description: string },
): Result {
  if (hub.products.length >= MAX_PRODUCTS) {
    return { ok: false, error: "This workspace already has the maximum number of apps." };
  }
  const name = input.name.trim().slice(0, 48);
  if (name.length < 2) return { ok: false, error: "Name the app in at least two characters." };
  const origin = input.origin.trim();
  if (!validOrigin(origin)) {
    return { ok: false, error: "Use an https origin only, like https://example.com — no path, query, or login." };
  }
  if (hub.products.some((p) => p.origin === origin)) {
    return { ok: false, error: "An app with that origin is already registered." };
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  const product: Product = {
    id: `${slug || "app"}-${uid().slice(0, 8)}`,
    name,
    origin,
    description: input.description.trim().slice(0, 140),
    createdAt: now(),
  };
  const next = log(
    { ...hub, products: [...hub.products, product] },
    "App registered",
    `${name} · ${origin}. Metadata only — no credentials stored.`,
  );
  return { ok: true, hub: next };
}

export function deleteProduct(hub: Hub, productId: string): Result {
  const product = hub.products.find((p) => p.id === productId);
  if (!product) return { ok: false, error: "That app is no longer registered." };
  const removed = hub.grants.filter((g) => g.productId === productId).length;
  const next = log(
    {
      ...hub,
      products: hub.products.filter((p) => p.id !== productId),
      grants: hub.grants.filter((g) => g.productId !== productId),
    },
    "App removed",
    `${product.name} removed, along with ${removed} grant${removed === 1 ? "" : "s"}.`,
  );
  return { ok: true, hub: next };
}

function sameScopes(a: ScopeId[], b: ScopeId[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].sort();
  const right = [...b].sort();
  return left.every((scope, index) => scope === right[index]);
}

export function setGrant(
  hub: Hub,
  input: { productId: string; connectionId: string; scopes: string[] },
): Result {
  const product = hub.products.find((p) => p.id === input.productId);
  if (!product) return { ok: false, error: "Register the app before granting access." };
  const connection = hub.connections.find((c) => c.id === input.connectionId);
  if (!connection) return { ok: false, error: "Connect the account before granting access." };
  const provider = providerById(connection.provider);
  const scopes = cleanScopes(input.scopes, connection.scopes);
  const existing = hub.grants.find((g) => g.productId === product.id && g.connectionId === connection.id);
  if (scopes.length === 0) {
    if (!existing) return { ok: true, hub };
    const next = log(
      { ...hub, grants: hub.grants.filter((g) => g.id !== existing.id) },
      "Grant revoked",
      `${product.name} can no longer use ${connection.handle} on ${provider?.name ?? "this platform"}.`,
    );
    return { ok: true, hub: next };
  }
  if (existing && sameScopes(existing.scopes, scopes)) return { ok: true, hub };
  const grant: Grant = {
    id: existing?.id ?? uid(),
    productId: product.id,
    connectionId: connection.id,
    scopes,
    grantedAt: now(),
  };
  const grants = existing
    ? hub.grants.map((g) => (g.id === existing.id ? grant : g))
    : [grant, ...hub.grants];
  const next = log(
    { ...hub, grants },
    existing ? "Grant updated" : "Grant added",
    `${product.name} may use ${scopes.map(scopeLabel).join(", ")} on ${connection.handle}.`,
  );
  return { ok: true, hub: next };
}

export function updateWidget(
  hub: Hub,
  input: { name: string; theme: string; providers: string[] },
): Result {
  const name = input.name.trim().slice(0, 40);
  if (name.length < 2) return { ok: false, error: "Give the widget an app name." };
  if (input.theme !== "light" && input.theme !== "dark") {
    return { ok: false, error: "Choose a light or dark widget theme." };
  }
  const providers = input.providers.filter(isProvider);
  if (providers.length === 0) return { ok: false, error: "Show at least one platform in the widget." };
  const widget: WidgetConfig = { name, theme: input.theme, providers: [...new Set(providers)] };
  const next = log({ ...hub, widget }, "Widget updated", `${name} · ${widget.theme} · ${widget.providers.length} platforms.`);
  return { ok: true, hub: next };
}

const SAMPLES: Array<{ provider: ProviderId; handle: string; displayName: string; scopes: ScopeId[] }> = [
  { provider: "x", handle: "@northwind", displayName: "Northwind", scopes: ["profile", "publish"] },
  {
    provider: "instagram",
    handle: "@northwind.studio",
    displayName: "Northwind Studio",
    scopes: ["profile", "media", "publish"],
  },
  { provider: "linkedin", handle: "@northwind", displayName: "Northwind", scopes: ["profile", "publish"] },
];

export function seedSample(hub: Hub): Result {
  let next = hub;
  for (const sample of SAMPLES) {
    const exists = next.connections.some(
      (c) => c.provider === sample.provider && c.handle.toLowerCase() === sample.handle.toLowerCase(),
    );
    if (exists) continue;
    const created = connectAccount(next, sample);
    if (!created.ok) return created;
    next = created.hub;
  }
  const product = next.products.find((p) => p.id === "socialpostapi") ?? next.products[0];
  if (!product) return { ok: false, error: "Register an app before loading samples." };
  for (const sample of SAMPLES) {
    const connection = next.connections.find(
      (c) => c.provider === sample.provider && c.handle.toLowerCase() === sample.handle.toLowerCase(),
    );
    if (!connection) continue;
    const already = next.grants.some((g) => g.productId === product.id && g.connectionId === connection.id);
    if (already) continue;
    const granted = setGrant(next, {
      productId: product.id,
      connectionId: connection.id,
      scopes: sample.scopes.filter((scope) => connection.scopes.includes(scope)),
    });
    if (!granted.ok) return granted;
    next = granted.hub;
  }
  return { ok: true, hub: next };
}

export function exportPayload(hub: Hub): string {
  return JSON.stringify(
    {
      sandbox: true,
      authenticated: false,
      note: "Simulated workspace. No provider tokens are included because none exist.",
      ...hub,
    },
    null,
    2,
  );
}
