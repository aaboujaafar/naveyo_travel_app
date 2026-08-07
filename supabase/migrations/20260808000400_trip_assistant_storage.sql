-- Durable AI drafts and per-account daily quota for AI-001.
create table if not exists public.trip_suggestion_drafts (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid not null references public.stops(id) on delete cascade,
  candidate_id uuid not null references public.places(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 500),
  reason text not null check (length(trim(reason)) between 1 and 500),
  created_by uuid not null references public.accounts(id) on delete restrict,
  created_at timestamptz not null default now()
);

grant select on table public.places to authenticated;

create index if not exists trip_suggestion_drafts_trip_idx on public.trip_suggestion_drafts(trip_id, stop_id, created_at desc);

alter table public.trip_suggestion_drafts enable row level security;
revoke all on table public.trip_suggestion_drafts from anon, authenticated;
grant select, insert on table public.trip_suggestion_drafts to authenticated;

drop policy if exists trip_suggestion_drafts_member_read on public.trip_suggestion_drafts;
create policy trip_suggestion_drafts_member_read
on public.trip_suggestion_drafts for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists trip_suggestion_drafts_editor_create on public.trip_suggestion_drafts;
create policy trip_suggestion_drafts_editor_create
on public.trip_suggestion_drafts for insert to authenticated
with check (public.can_edit_trip(trip_id) and created_by = auth.uid());

create table if not exists public.ai_usage_daily (
  account_id uuid not null references public.accounts(id) on delete cascade,
  usage_date date not null default current_date,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (account_id, usage_date)
);

revoke all on table public.ai_usage_daily from anon, authenticated;

create or replace function public.consume_trip_assistant_quota(target_account uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if target_account <> auth.uid() then
    return false;
  end if;

  insert into public.ai_usage_daily(account_id, usage_date, request_count)
  values (target_account, current_date, 1)
  on conflict (account_id, usage_date) do update
  set request_count = public.ai_usage_daily.request_count + 1
  where public.ai_usage_daily.request_count < 20
  returning request_count into updated_count;

  return updated_count is not null and updated_count <= 20;
end;
$$;

revoke all on function public.consume_trip_assistant_quota(uuid) from public, anon;
grant execute on function public.consume_trip_assistant_quota(uuid) to authenticated;
