-- Wish list of a Voyage: places a member would like to do, with each
-- member's vote, before they become part of the programme.

create table if not exists public.trip_wishes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete set null,
  -- Snapshot of the place as the member saw it (name, category, coordinates…).
  place jsonb not null check (jsonb_typeof(place) = 'object'),
  added_by uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists trip_wishes_trip_id_idx on public.trip_wishes (trip_id);

create table if not exists public.trip_wish_votes (
  wish_id uuid not null references public.trip_wishes(id) on delete cascade,
  account_id uuid not null default auth.uid() references public.accounts(id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (wish_id, account_id)
);

alter table public.trip_wishes enable row level security;
alter table public.trip_wish_votes enable row level security;

drop policy if exists trip_wishes_select_member on public.trip_wishes;
create policy trip_wishes_select_member on public.trip_wishes
for select to authenticated using (public.is_trip_member(trip_id));

drop policy if exists trip_wishes_insert_editor on public.trip_wishes;
create policy trip_wishes_insert_editor on public.trip_wishes
for insert to authenticated with check (public.can_edit_trip(trip_id) and added_by = auth.uid());

drop policy if exists trip_wishes_delete_editor on public.trip_wishes;
create policy trip_wishes_delete_editor on public.trip_wishes
for delete to authenticated using (public.can_edit_trip(trip_id));

drop policy if exists trip_wish_votes_select_member on public.trip_wish_votes;
create policy trip_wish_votes_select_member on public.trip_wish_votes
for select to authenticated using (
  exists (select 1 from public.trip_wishes w where w.id = wish_id and public.is_trip_member(w.trip_id))
);

-- Each member only casts, changes or withdraws their own vote.
drop policy if exists trip_wish_votes_own on public.trip_wish_votes;
create policy trip_wish_votes_own on public.trip_wish_votes
for all to authenticated
using (account_id = auth.uid())
with check (
  account_id = auth.uid()
  and exists (select 1 from public.trip_wishes w where w.id = wish_id and public.can_edit_trip(w.trip_id))
);

grant select, insert, delete on table public.trip_wishes to authenticated;
grant select, insert, update, delete on table public.trip_wish_votes to authenticated;
