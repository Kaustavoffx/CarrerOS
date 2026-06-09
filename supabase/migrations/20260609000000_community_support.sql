-- 1. Create resources table
create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null, -- 'scholarship', 'mentorship', 'internship', 'scheme', 'certification', 'center', 'ngo', 'job_fair', 'event', 'wellness', 'student_service'
  description text not null,
  eligibility jsonb not null default '{}'::jsonb,
  application_link text not null default '#',
  contact_details text,
  address text,
  city text,
  state text,
  postal_code text,
  latitude double precision,
  longitude double precision,
  verified boolean not null default true,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Create agent actions table for tracking agentic workflows
create table if not exists public.agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  resource_id uuid references public.community_resources on delete cascade,
  action_type text not null, -- 'verify_eligibility', 'draft_sop_or_application'
  status text not null default 'pending', -- 'pending', 'executing', 'completed', 'failed'
  payload jsonb not null default '{}'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 3. Enable RLS on new tables
alter table public.community_resources enable row level security;
alter table public.agent_actions enable row level security;

-- 4. Set up Policies
create policy "Community resources are viewable by everyone"
  on public.community_resources for select
  using (true);

create policy "Agent actions are viewable by owner"
  on public.agent_actions for select
  using (auth.uid() = user_id);

create policy "Agent actions are insertable by owner"
  on public.agent_actions for insert
  with check (auth.uid() = user_id);

create policy "Agent actions are updatable by owner"
  on public.agent_actions for update
  using (auth.uid() = user_id);

-- 5. Haversine distance calculation helper function
create or replace function public.calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
) returns double precision as $$
declare
  r double precision := 6371; -- Earth radius in km
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then
    return null;
  end if;
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  return r * c;
end;
$$ language plpgsql immutable;
