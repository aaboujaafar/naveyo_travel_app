-- Repayments between members of a Voyage: once a suggested transfer is made,
-- it is recorded so « Qui paie quoi » shows what is still owed.

create table if not exists public.trip_repayments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid not null references public.accounts(id) on delete cascade,
  minor_units bigint not null check (minor_units > 0),
  currency char(3) not null,
  recorded_by uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);
create index if not exists trip_repayments_trip_id_idx on public.trip_repayments (trip_id);

alter table public.trip_repayments enable row level security;

drop policy if exists trip_repayments_select_member on public.trip_repayments;
create policy trip_repayments_select_member on public.trip_repayments
for select to authenticated using (public.is_trip_member(trip_id));

-- Either side of the transfer may record or cancel it, and both must be members.
drop policy if exists trip_repayments_insert_party on public.trip_repayments;
create policy trip_repayments_insert_party on public.trip_repayments
for insert to authenticated with check (
  public.can_edit_trip(trip_id)
  and recorded_by = auth.uid()
  and auth.uid() in (from_account_id, to_account_id)
  and exists (select 1 from public.trip_members m where m.trip_id = trip_repayments.trip_id and m.account_id = from_account_id)
  and exists (select 1 from public.trip_members m where m.trip_id = trip_repayments.trip_id and m.account_id = to_account_id)
);

drop policy if exists trip_repayments_delete_party on public.trip_repayments;
create policy trip_repayments_delete_party on public.trip_repayments
for delete to authenticated using (public.can_edit_trip(trip_id) and auth.uid() in (from_account_id, to_account_id));

grant select, insert, delete on table public.trip_repayments to authenticated;
