-- Identity Hub schema: people sign in with a platform, connect platform
-- accounts, and grant registered apps scoped access to chosen accounts.

create table if not exists users (
  id text primary key,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Platform identities that can sign in to a user.
create table if not exists user_logins (
  provider text not null,
  subject text not null,
  user_id text not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (provider, subject)
);
create index if not exists user_logins_user_idx on user_logins (user_id);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);

-- In-flight platform authorizations (login or connect), single use.
create table if not exists oauth_states (
  state text primary key,
  intent text not null check (intent in ('login', 'connect')),
  user_id text references users (id) on delete cascade,
  provider text not null,
  verifier text not null,
  return_to text not null,
  expires_at timestamptz not null
);

-- Connected platform accounts. Tokens are AES-256-GCM encrypted.
create table if not exists accounts (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  provider text not null,
  account_id text not null,
  handle text not null,
  display_name text not null,
  avatar_url text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  platform_scopes text not null default '',
  connected_at timestamptz not null default now(),
  unique (user_id, provider, account_id)
);
create index if not exists accounts_user_idx on accounts (user_id);

-- Apps (products) that people can authorize: SocialPostAPI, Makketing, ...
create table if not exists apps (
  id text primary key,
  owner_id text not null references users (id) on delete cascade,
  name text not null,
  homepage_url text not null,
  redirect_uris text[] not null,
  client_id text not null unique,
  client_secret_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists apps_owner_idx on apps (owner_id);

-- Which accounts a person lets an app use, and with which hub scopes.
create table if not exists app_grants (
  user_id text not null references users (id) on delete cascade,
  app_id text not null references apps (id) on delete cascade,
  account_id text not null references accounts (id) on delete cascade,
  scopes text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, app_id, account_id)
);

create table if not exists auth_codes (
  code_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  app_id text not null references apps (id) on delete cascade,
  redirect_uri text not null,
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Tokens apps use server-side. Valid until revoked by the app or the person.
create table if not exists app_tokens (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  app_id text not null references apps (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists app_tokens_user_app_idx on app_tokens (user_id, app_id);

create table if not exists activity (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  action text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_idx on activity (user_id, created_at desc);
