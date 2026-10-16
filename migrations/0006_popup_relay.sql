-- Popup sign-in. The page that opens a popup makes a random relay id; when
-- the popup finishes, the hub stores where the page should go next under the
-- id's hash, and the page picks it up by polling (single read). Polling works
-- even when the platform's page cut the popup's link to its opener.
create table if not exists auth_relays (
  relay_hash text primary key,
  location text not null,
  expires_at timestamptz not null
);

alter table oauth_states add column if not exists relay_hash text;
