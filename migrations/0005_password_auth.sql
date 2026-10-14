-- Email + password sign-in, TOTP two-factor, rate limits, session idle
-- tracking, and each app's sign-in widget settings.

-- Email is stored as typed for display; email_normalized (lowercased, NFKC)
-- is the unique lookup key.
alter table users add column if not exists email text;
alter table users add column if not exists email_normalized text;
alter table users add column if not exists email_verified_at timestamptz;
-- Argon2id PHC string. Null for people who only sign in with a platform.
alter table users add column if not exists password_hash text;
alter table users add column if not exists password_changed_at timestamptz;
-- TOTP secret, AES-256-GCM encrypted. mfa_enabled_at is set once confirmed.
alter table users add column if not exists mfa_secret text;
alter table users add column if not exists mfa_enabled_at timestamptz;
-- Last accepted TOTP time step, so a code cannot be replayed.
alter table users add column if not exists mfa_last_step bigint;
create unique index if not exists users_email_normalized_idx on users (email_normalized);

create table if not exists mfa_recovery_codes (
  user_id text not null references users (id) on delete cascade,
  code_hash text not null,
  used_at timestamptz,
  primary key (user_id, code_hash)
);

-- Single-use links sent by email. Only the SHA-256 of the token is stored.
-- signup: no user exists until the mailbox owner clicks the link, so nobody
--   can squat an address by registering it without access to the inbox.
-- add_email: a signed-in user attaching an email and password.
-- reset_password: a forgotten-password link for a verified address.
create table if not exists email_tokens (
  token_hash text primary key,
  purpose text not null check (purpose in ('signup', 'add_email', 'reset_password')),
  user_id text references users (id) on delete cascade,
  email text not null,
  display_name text,
  password_hash text,
  return_to text not null default '/workspace',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_tokens_user_idx on email_tokens (user_id, purpose);

-- Password accepted, second factor pending.
create table if not exists login_challenges (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  return_to text not null,
  attempts int not null default 0,
  expires_at timestamptz not null
);

-- Fixed-window counters for brute-force and abuse limits.
create table if not exists rate_limits (
  key text primary key,
  count int not null,
  window_start timestamptz not null
);

alter table sessions add column if not exists last_seen_at timestamptz not null default now();
alter table sessions add column if not exists user_agent text;

-- Sign-in methods an app's widget and consent screen offer:
-- platform ids and/or 'password'. An empty list means every enabled method.
alter table apps add column if not exists sign_in_methods text[] not null default '{}';
alter table apps add column if not exists widget_theme text not null default 'light'
  check (widget_theme in ('light', 'dark'));
