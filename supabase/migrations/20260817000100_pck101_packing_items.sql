-- PCK-101: shared packing list items.

do $$ begin
  create type public.packing_item_category as enum (
    'documents', 'clothing', 'toiletries', 'electronics', 'health', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete set null,
  label text not null check (length(trim(label)) between 1 and 160),
  category public.packing_item_category not null default 'other',
  quantity integer not null default 1 check (quantity between 1 and 99),
  packed boolean not null default false,
  assigned_to uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists packing_items_trip_packed_idx
  on public.packing_items (trip_id, packed);
create index if not exists packing_items_trip_category_idx
  on public.packing_items (trip_id, category);

create or replace function public.validate_packing_item_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stop_id is not null and not exists (
    select 1
    from public.stops s
    where s.id = new.stop_id
      and s.trip_id = new.trip_id
  ) then
    raise exception 'Packing item stop must belong to the packing item trip';
  end if;

  if new.assigned_to is not null and not exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = new.trip_id
      and tm.account_id = new.assigned_to
  ) then
    raise exception 'Packing item assignee must be a member of the packing item trip';
  end if;

  return new;
end;
$$;

drop trigger if exists packing_items_validate_links on public.packing_items;
create trigger packing_items_validate_links
before insert or update of trip_id, stop_id, assigned_to
on public.packing_items
for each row execute function public.validate_packing_item_links();

create or replace function public.set_packing_item_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists packing_items_set_updated_at on public.packing_items;
create trigger packing_items_set_updated_at
before update on public.packing_items
for each row execute function public.set_packing_item_updated_at();

-- A stop cannot be moved to another trip while packing items still reference it.
-- Deleting a stop remains safe because stop_id is ON DELETE SET NULL.
create or replace function public.prevent_packing_item_stop_trip_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trip_id is distinct from old.trip_id and exists (
    select 1 from public.packing_items pi where pi.stop_id = old.id
  ) then
    raise exception 'Stop cannot change trips while referenced by packing items';
  end if;
  return new;
end;
$$;

drop trigger if exists stops_prevent_packing_item_trip_change on public.stops;
create trigger stops_prevent_packing_item_trip_change
before update of trip_id on public.stops
for each row execute function public.prevent_packing_item_stop_trip_change();

-- If a member leaves a trip, clear their optional assignments before the
-- membership row disappears so the assignment invariant remains true.
create or replace function public.clear_packing_item_assignments_on_member_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.packing_items
  set assigned_to = null
  where trip_id = old.trip_id
    and assigned_to = old.account_id;
  return old;
end;
$$;

drop trigger if exists trip_members_clear_packing_item_assignments on public.trip_members;
create trigger trip_members_clear_packing_item_assignments
after delete on public.trip_members
for each row execute function public.clear_packing_item_assignments_on_member_leave();

revoke all on function public.validate_packing_item_links() from public;
revoke all on function public.set_packing_item_updated_at() from public;
revoke all on function public.prevent_packing_item_stop_trip_change() from public;
revoke all on function public.clear_packing_item_assignments_on_member_leave() from public;

alter table public.packing_items enable row level security;
revoke all on table public.packing_items from anon, authenticated;
grant select, insert, update, delete on table public.packing_items to authenticated;

drop policy if exists packing_items_select_member on public.packing_items;
create policy packing_items_select_member
on public.packing_items
for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists packing_items_editor_write on public.packing_items;
create policy packing_items_editor_write
on public.packing_items
for all to authenticated
using (public.can_edit_trip(trip_id))
with check (public.can_edit_trip(trip_id));
