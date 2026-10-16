-- One-time transfer of a signed-in user from a framed credential page to the
-- top-level consent window. Only the SHA-256 of the token is stored.
create table if not exists embed_handoffs (
  token_hash text primary key,
  user_id text not null references users (id) on delete cascade,
  return_to text not null,
  expires_at timestamptz not null
);
