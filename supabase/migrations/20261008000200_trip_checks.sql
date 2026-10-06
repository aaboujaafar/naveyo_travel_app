-- Tasks of a Voyage marked as done (an ESTA requested, an arrival form
-- filled), shared by its members.

create table if not exists public.trip_checks (
  trip_id uuid not null references public.trips(id) on delete cascade,
  key text not null check (length(key) between 1 and 300),
  checked_by uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (trip_id, key)
);

alter table public.trip_checks enable row level security;

drop policy if exists trip_checks_select_member on public.trip_checks;
create policy trip_checks_select_member on public.trip_checks
for select to authenticated using (public.is_trip_member(trip_id));

drop policy if exists trip_checks_write_editor on public.trip_checks;
create policy trip_checks_write_editor on public.trip_checks
for all to authenticated
using (public.can_edit_trip(trip_id))
with check (public.can_edit_trip(trip_id) and checked_by = auth.uid());

grant select, insert, delete on table public.trip_checks to authenticated;
