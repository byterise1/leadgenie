-- Google Postmaster Tools integration — one connected Google account per
-- LeadGenie user, used to read domain-level Gmail reputation/spam-rate data
-- (free, official Google API; no seed-mailbox placement checking yet).
create table if not exists postmaster_connections (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null unique,
  google_email text,
  refresh_token text not null,
  connected_at timestamptz default now()
);
