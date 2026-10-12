import type { ProviderId, ScopeId, WidgetConfig } from "@/lib/hub";

export type ConnectionView = {
  id: string;
  provider: ProviderId;
  handle: string;
  displayName: string;
  scopes: ScopeId[];
  mode: "sandbox" | "live";
  status: string;
  connectedAt: string;
};

export type ProductView = {
  id: string;
  name: string;
  origin: string;
  description: string;
  clientId: string;
  createdAt: string;
  revealSecret?: string;
};

export type GrantView = {
  id: string;
  productId: string;
  connectionId: string;
  scopes: ScopeId[];
  grantedAt: string;
};

export type ActivityView = {
  id: string;
  at: string;
  action: string;
  detail: string;
};

export type PlanId = "sandbox" | "starter" | "growth" | "scale";

export type BillingView = {
  plan: PlanId;
  status: string;
  profileLimit: number;
  liveProfiles: number;
  currentPeriodEnd: string | null;
};

export type ReadinessView = {
  encryption: boolean;
  appOrigin: boolean;
  stripe: boolean;
  webhook: boolean;
  prices: { starter: boolean; growth: boolean; scale: boolean };
  providers: Record<ProviderId, { ready: boolean; missing: string[] }>;
};

export type HubView = {
  connections: ConnectionView[];
  products: ProductView[];
  grants: GrantView[];
  events: ActivityView[];
  widget: WidgetConfig;
  billing: BillingView;
  readiness: ReadinessView;
};

export type HubResult = {
  ok: true;
  hub: HubView;
  secret?: string;
  authorizeUrl?: string;
} | {
  ok: false;
  error: string;
  hub?: HubView;
};
