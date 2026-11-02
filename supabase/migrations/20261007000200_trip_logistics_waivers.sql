-- What the travellers said they do not need to book: a stay with friends or
-- in a van, a journey by their own means. Shared by the members of the Voyage.

create table if not exists public.trip_logistics_waivers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind text not null check (kind in ('stay', 'leg')),
  stop_id uuid references public.stops(id) on delete cascade,
  leg_key text check (leg_key is null or length(leg_key) between 1 and 300),
  mode text check (mode is null or mode in ('friends', 'camping', 'other')),
  address text check (address is null or length(trim(address)) between 1 and 300),
  created_by uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((kind = 'stay' and stop_id is not null and mode is not null) or (kind = 'leg' and leg_key is not null))
);
create index if not exists trip_logistics_waivers_trip_id_idx on public.trip_logistics_waivers (trip_id);

alter table public.trip_logistics_waivers enable row level security;

drop policy if exists trip_logistics_waivers_select_member on public.trip_logistics_waivers;
create policy trip_logistics_waivers_select_member on public.trip_logistics_waivers
for select to authenticated using (public.is_trip_member(trip_id));

drop policy if exists trip_logistics_waivers_write_editor on public.trip_logistics_waivers;
create policy trip_logistics_waivers_write_editor on public.trip_logistics_waivers
for all to authenticated
using (public.can_edit_trip(trip_id))
with check (public.can_edit_trip(trip_id) and created_by = auth.uid());

grant select, insert, delete on table public.trip_logistics_waivers to authenticated;
