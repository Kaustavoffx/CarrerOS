create table if not exists public.user_ai_keys (
  user_id uuid primary key references auth.users on delete cascade,
  provider text not null,
  encrypted_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_ai_keys enable row level security;

create policy "AI keys are viewable by owner"
  on public.user_ai_keys for select
  using (auth.uid() = user_id);

create policy "AI keys are insertable by owner"
  on public.user_ai_keys for insert
  with check (auth.uid() = user_id);

create policy "AI keys are updatable by owner"
  on public.user_ai_keys for update
  using (auth.uid() = user_id);

create policy "AI keys are deletable by owner"
  on public.user_ai_keys for delete
  using (auth.uid() = user_id);

revoke all on public.user_ai_keys from anon, authenticated;