-- Repair the quota RPC when the original AI-001 migration was only partially applied.
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
