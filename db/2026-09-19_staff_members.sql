-- =============================================================================
-- CUPAI — Staff members (team accounts with scoped permissions).
--
-- A staff member belongs to exactly one merchant (the brand owner). When a
-- staff email signs in with Google, the app session is created with the
-- OWNER's user id (so every existing data query keeps working) plus the
-- staff id, and every server function checks the staff permissions.
--
-- All reads/writes go through server functions using the service role, so RLS
-- is enabled with NO policies (anon/authenticated get nothing).
-- Safe to re-run.
-- =============================================================================

create table if not exists public.staff_members (
  id            uuid primary key default gen_random_uuid(),
  merchant_id   uuid not null,
  email         text not null,
  name          text not null default '',
  permissions   text[] not null default '{}',
  full_access   boolean not null default false,
  status        text not null default 'active'
                  check (status in ('active', 'disabled')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_login_at timestamptz
);

-- One staff row per email globally: a single email must resolve to exactly one
-- brand at sign-in time.
create unique index if not exists staff_members_email_key
  on public.staff_members (lower(email));

create index if not exists staff_members_merchant_idx
  on public.staff_members (merchant_id, created_at desc);

grant all on public.staff_members to service_role;

alter table public.staff_members enable row level security;
