-- ═══════════════════════════════════════════
-- LeadGenie Database Schema
-- Run this in Supabase → SQL Editor → Run
-- ═══════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company text,
  website text,
  timezone text default 'UTC',
  plan text default 'free',
  credits_used integer default 0,
  credits_total integer default 100,
  created_at timestamptz default now()
);

-- ── Email accounts ─────────────────────────
create table if not exists email_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  email text not null,
  type text not null check (type in ('gmail-oauth','gmail-app','imap','smtp')),
  smtp_host text,
  smtp_port integer,
  smtp_user text,
  smtp_pass text,
  imap_host text,
  imap_port integer,
  access_token text,
  refresh_token text,
  status text default 'active' check (status in ('active','warming','error','paused')),
  health_score integer default 80,
  warmup_enabled boolean default false,
  sent_today integer default 0,
  created_at timestamptz default now()
);

-- ── Campaigns ──────────────────────────────
create table if not exists campaigns (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  goal text default 'Book a Meeting',
  status text default 'draft' check (status in ('draft','active','paused','completed')),
  daily_limit integer default 50,
  from_hour text default '8:00 AM',
  to_hour text default '6:00 PM',
  active_days jsonb default '[true,true,true,true,true,false,false]',
  timezone text default 'UTC',
  start_date date,
  total_sent integer default 0,
  total_opened integer default 0,
  total_replied integer default 0,
  created_at timestamptz default now()
);

-- ── Campaign ↔ Accounts (many-to-many) ─────
create table if not exists campaign_accounts (
  campaign_id uuid references campaigns(id) on delete cascade,
  account_id uuid references email_accounts(id) on delete cascade,
  primary key (campaign_id, account_id)
);

-- ── Email steps ────────────────────────────
create table if not exists email_steps (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  step_number integer not null,
  subject text not null,
  body text not null,
  delay_days integer default 0,
  include_unsub boolean default false,
  created_at timestamptz default now()
);

-- ── Leads ──────────────────────────────────
create table if not exists leads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  first_name text,
  last_name text,
  email text not null,
  company text,
  title text,
  website text,
  linkedin text,
  phone text,
  unsubscribed boolean default false,
  created_at timestamptz default now()
);

-- ── Campaign leads (enrolment) ─────────────
create table if not exists campaign_leads (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending','active','completed','replied','unsubscribed','bounced')),
  current_step integer default 0,
  last_sent_at timestamptz,
  next_send_at timestamptz,
  unique (campaign_id, lead_id)
);

-- ── Sent emails (tracking) ─────────────────
create table if not exists sent_emails (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  campaign_id uuid references campaigns(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  account_id uuid references email_accounts(id),
  step_number integer default 0,
  message_id text,
  subject text,
  sent_at timestamptz default now(),
  opened_at timestamptz,
  replied_at timestamptz,
  bounced boolean default false
);

-- ── Inbox threads ──────────────────────────
create table if not exists inbox_threads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  campaign_id uuid references campaigns(id),
  lead_id uuid references leads(id),
  account_id uuid references email_accounts(id),
  subject text,
  last_message text,
  from_email text,
  from_name text,
  status text default 'new' check (status in ('new','interested','not_interested','out_of_office','do_not_contact')),
  read boolean default false,
  received_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ── Warmup emails ──────────────────────────
create table if not exists warmup_emails (
  id uuid default uuid_generate_v4() primary key,
  from_account_id uuid references email_accounts(id) on delete cascade,
  to_account_id uuid references email_accounts(id) on delete cascade,
  subject text,
  body text,
  sent_at timestamptz default now(),
  received boolean default false,
  replied boolean default false,
  in_spam boolean default false
);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

alter table profiles enable row level security;
alter table email_accounts enable row level security;
alter table campaigns enable row level security;
alter table campaign_accounts enable row level security;
alter table email_steps enable row level security;
alter table leads enable row level security;
alter table campaign_leads enable row level security;
alter table sent_emails enable row level security;
alter table inbox_threads enable row level security;

-- Profiles
create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- Email accounts
create policy "own email_accounts" on email_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campaigns
create policy "own campaigns" on campaigns for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campaign accounts
create policy "own campaign_accounts" on campaign_accounts for all
  using (exists (select 1 from campaigns where id = campaign_id and user_id = auth.uid()));

-- Email steps
create policy "own email_steps" on email_steps for all
  using (exists (select 1 from campaigns where id = campaign_id and user_id = auth.uid()));

-- Leads
create policy "own leads" on leads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Campaign leads
create policy "own campaign_leads" on campaign_leads for all
  using (exists (select 1 from campaigns where id = campaign_id and user_id = auth.uid()));

-- Sent emails
create policy "own sent_emails" on sent_emails for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Inbox
create policy "own inbox_threads" on inbox_threads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Increment campaign sent counter
create or replace function increment_campaign_sent(campaign_id uuid)
returns void as $$
  update campaigns set total_sent = total_sent + 1 where id = campaign_id;
$$ language sql security definer;

-- Reset daily sent counts (call via cron)
create or replace function reset_daily_sent()
returns void as $$
  update email_accounts set sent_today = 0;
$$ language sql security definer;
