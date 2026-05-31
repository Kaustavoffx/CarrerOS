create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  goal text,
  readiness_score integer not null default 0,
  experience_level text,
  skills jsonb not null default '[]'::jsonb,
  learning_style text,
  budget text,
  time_availability text,
  weaknesses jsonb not null default '[]'::jsonb,
  obstacles jsonb not null default '[]'::jsonb,
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.career_workspace_state (
  user_id uuid primary key references auth.users on delete cascade,
  roadmaps jsonb not null default '[]'::jsonb,
  progress jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  ai_chats jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  status text not null,
  summary text not null,
  owner text not null default 'You',
  progress integer not null default 0,
  career_domain text not null default 'general',
  career_demand_score integer not null default 0,
  market_outlook text not null default '',
  salary_range text not null default '',
  automation_risk text not null default '',
  roadmap_version integer not null default 1,
  generated_at timestamptz not null default now(),
  ai_reasoning text not null default '',
  weekly_schedule jsonb not null default '[]'::jsonb,
  learning_outcomes jsonb not null default '[]'::jsonb,
  total_duration_weeks integer not null default 0,
  weekly_hours integer not null default 0,
  estimated_completion_date date not null default current_date,
  resource_links jsonb not null default '[]'::jsonb,
  project_tasks jsonb not null default '[]'::jsonb,
  expected_outcomes jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  roadmap_version integer not null,
  career_goal text not null,
  career_domain text not null,
  generated_at timestamptz not null default now(),
  ai_reasoning text not null default '',
  roadmaps jsonb not null default '[]'::jsonb,
  progress integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.career_workspace_state enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_versions enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Workspace state is viewable by owner"
  on public.career_workspace_state for select
  using (auth.uid() = user_id);

create policy "Workspace state is insertable by owner"
  on public.career_workspace_state for insert
  with check (auth.uid() = user_id);

create policy "Workspace state is updatable by owner"
  on public.career_workspace_state for update
  using (auth.uid() = user_id);

create policy "Roadmaps are viewable by owner"
  on public.roadmaps for select
  using (auth.uid() = user_id);

create policy "Roadmaps are insertable by owner"
  on public.roadmaps for insert
  with check (auth.uid() = user_id);

create policy "Roadmaps are updatable by owner"
  on public.roadmaps for update
  using (auth.uid() = user_id);

create policy "Roadmaps are deletable by owner"
  on public.roadmaps for delete
  using (auth.uid() = user_id);

create policy "Roadmap versions are viewable by owner"
  on public.roadmap_versions for select
  using (auth.uid() = user_id);

create policy "Roadmap versions are insertable by owner"
  on public.roadmap_versions for insert
  with check (auth.uid() = user_id);

create policy "Roadmap versions are updatable by owner"
  on public.roadmap_versions for update
  using (auth.uid() = user_id);

create policy "Roadmap versions are deletable by owner"
  on public.roadmap_versions for delete
  using (auth.uid() = user_id);

create table if not exists public.user_usage (
  user_id uuid primary key references auth.users on delete cascade,
  free_generations_used integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_usage enable row level security;

create policy "User usage is viewable by owner"
  on public.user_usage for select
  using (auth.uid() = user_id);

create policy "User usage is insertable by owner"
  on public.user_usage for insert
  with check (auth.uid() = user_id);

create policy "User usage is updatable by owner"
  on public.user_usage for update
  using (auth.uid() = user_id);
