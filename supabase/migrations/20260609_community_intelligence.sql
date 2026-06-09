-- ============================================================
-- CareerOS Community Intelligence Tables
-- Migration: 20260609_community_intelligence
-- Run this in Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- 1. community_need_reports
-- Stores user-submitted community need requests
create table if not exists public.community_need_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  category    text not null,   -- 'career_mentorship' | 'housing' | 'food' | 'mental_health' | 'scholarship' | 'internship' | 'other'
  urgency     text not null default 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  description text,
  city        text,
  district    text,
  state       text,
  country     text not null default 'India',
  lat         double precision,
  lng         double precision,
  status      text not null default 'open', -- 'open' | 'in_progress' | 'resolved'
  created_at  timestamptz not null default now()
);

-- 2. community_resources
-- Verified program/resource listings (supplements SEEDED_RESOURCES)
create table if not exists public.community_resources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  type                text not null, -- 'scholarship' | 'internship' | 'mentorship' | 'center' | 'wellness' | 'scheme'
  city                text,
  state               text,
  country             text not null default 'India',
  description         text,
  eligibility_notes   text,
  application_url     text,
  deadline            text,
  verified            boolean not null default false,
  tags                jsonb not null default '[]'::jsonb,
  lat                 double precision,
  lng                 double precision,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 3. community_ai_actions
-- Logs every agentic workflow execution
create table if not exists public.community_ai_actions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete set null,
  action_type    text not null, -- 'community_response' | 'verify_eligibility' | 'draft_application'
  input_query    text,
  step_logs      jsonb not null default '[]'::jsonb,
  output         text,
  resource_ids   jsonb not null default '[]'::jsonb,
  urgency_score  integer,
  category       text,
  completed      boolean not null default false,
  created_at     timestamptz not null default now()
);

-- 4. community_gap_snapshots
-- Point-in-time gap scores per city + category
create table if not exists public.community_gap_snapshots (
  id                 uuid primary key default gen_random_uuid(),
  city               text not null,
  category           text not null,
  request_count      integer not null default 0,
  available_count    integer not null default 0,
  gap_score          integer not null default 0, -- 0-100
  snapshot_date      date not null default current_date,
  created_at         timestamptz not null default now()
);

-- 5. community_forecasts
-- AI-generated demand forecast cache (TTL 6 hours)
create table if not exists public.community_forecasts (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,
  current_demand    integer not null default 0,
  predicted_demand  integer not null default 0,
  percent_change    numeric(5,2) not null default 0,
  trend             text not null default 'stable', -- 'crisis' | 'increasing' | 'stable' | 'declining'
  forecast_period   text not null default '30d',
  data_points       jsonb not null default '[]'::jsonb,
  generated_at      timestamptz not null default now()
);

-- 6. community_heatmap_points
-- Lat/lng intensity points derived from need reports
create table if not exists public.community_heatmap_points (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references public.community_need_reports on delete cascade,
  category    text not null,
  city        text,
  lat         double precision not null,
  lng         double precision not null,
  intensity   numeric(4,2) not null default 1.0,
  created_at  timestamptz not null default now()
);

-- 7. community_feedback
-- User feedback on resources
create table if not exists public.community_feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete set null,
  resource_id   uuid references public.community_resources on delete cascade,
  rating        integer check (rating between 1 and 5),
  comment       text,
  helpful       boolean,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.community_need_reports   enable row level security;
alter table public.community_resources      enable row level security;
alter table public.community_ai_actions     enable row level security;
alter table public.community_gap_snapshots  enable row level security;
alter table public.community_forecasts      enable row level security;
alter table public.community_heatmap_points enable row level security;
alter table public.community_feedback       enable row level security;

-- community_need_reports: anyone authenticated can read, own-insert
create policy "Need reports readable by authenticated"
  on public.community_need_reports for select
  using (auth.role() = 'authenticated');

create policy "Need reports insertable by authenticated"
  on public.community_need_reports for insert
  with check (auth.role() = 'authenticated');

create policy "Need reports updatable by owner"
  on public.community_need_reports for update
  using (auth.uid() = user_id);

-- community_resources: all authenticated can read
create policy "Resources readable by authenticated"
  on public.community_resources for select
  using (auth.role() = 'authenticated');

-- community_ai_actions: owner read/insert
create policy "AI actions readable by owner"
  on public.community_ai_actions for select
  using (auth.uid() = user_id);

create policy "AI actions insertable by owner"
  on public.community_ai_actions for insert
  with check (auth.uid() = user_id);

-- community_gap_snapshots: all authenticated can read (aggregated, no PII)
create policy "Gap snapshots readable by authenticated"
  on public.community_gap_snapshots for select
  using (auth.role() = 'authenticated');

-- community_forecasts: all authenticated can read
create policy "Forecasts readable by authenticated"
  on public.community_forecasts for select
  using (auth.role() = 'authenticated');

-- community_heatmap_points: all authenticated can read
create policy "Heatmap points readable by authenticated"
  on public.community_heatmap_points for select
  using (auth.role() = 'authenticated');

-- community_feedback: owner read/insert
create policy "Feedback readable by owner"
  on public.community_feedback for select
  using (auth.uid() = user_id);

create policy "Feedback insertable by owner"
  on public.community_feedback for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- Indexes for performance
-- ============================================================

create index if not exists idx_need_reports_category    on public.community_need_reports(category);
create index if not exists idx_need_reports_city        on public.community_need_reports(city);
create index if not exists idx_need_reports_created_at  on public.community_need_reports(created_at desc);
create index if not exists idx_need_reports_status      on public.community_need_reports(status);
create index if not exists idx_resources_type           on public.community_resources(type);
create index if not exists idx_resources_city           on public.community_resources(city);
create index if not exists idx_gap_snapshots_date       on public.community_gap_snapshots(snapshot_date desc);
create index if not exists idx_forecasts_category       on public.community_forecasts(category);
create index if not exists idx_heatmap_points_city      on public.community_heatmap_points(city);
create index if not exists idx_ai_actions_user          on public.community_ai_actions(user_id, created_at desc);
