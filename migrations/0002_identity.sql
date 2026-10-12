create table if not exists tenants (
  user_id text primary key,
  name text not null,
  widget_name text not null default 'Your app',
  widget_theme text not null default 'light',
  widget_providers text not null default 'x,instagram,facebook,tiktok,linkedin,youtube,reddit',
  created_at timestamptz not null default now()
);

create table if not exists products (
  id text primary key,
  user_id text not null,
  name text not null,
  origin text not null,
  description text not null default '',
  client_id text not null unique,
  client_secret_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists products_user_id_idx on products (user_id);

create table if not exists connections (
  id text primary key,
  user_id text not null,
  provider text not null,
  handle text not null,
  display_name text not null,
  scopes text not null,
  mode text not null,
  status text not null default 'connected',
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  unique (user_id, provider, handle)
);
create index if not exists connections_user_id_idx on connections (user_id);

create table if not exists grants (
  id text primary key,
  user_id text not null,
  product_id text not null,
  connection_id text not null,
  scopes text not null,
  granted_at timestamptz not null default now(),
  unique (product_id, connection_id)
);
create index if not exists grants_user_id_idx on grants (user_id);

create table if not exists oauth_transactions (
  state text primary key,
  user_id text not null,
  provider text not null,
  verifier text not null,
  scopes text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists exchange_codes (
  id text primary key,
  user_id text not null,
  product_id text not null,
  connection_id text not null,
  code_hash text not null unique,
  scopes text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists product_tokens (
  token_hash text primary key,
  user_id text not null,
  product_id text not null,
  connection_id text not null,
  scopes text not null,
  expires_at timestamptz not null
);

create table if not exists audit_events (
  id text primary key,
  user_id text not null,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
create index if not exists audit_events_user_id_idx on audit_events (user_id, created_at desc);

create table if not exists billing (
  user_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'sandbox',
  status text not null default 'inactive',
  current_period_end timestamptz
);
