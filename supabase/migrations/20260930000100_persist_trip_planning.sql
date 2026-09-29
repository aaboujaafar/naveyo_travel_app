-- Persist itinerary, places and expenses in Supabase instead of process memory,
-- and restore the privileges required to edit an Étape.
-- RLS policies from the foundation migration still restrict rows to trip editors.

grant update, delete on table public.stops to authenticated;
grant insert, update on table public.places to authenticated;
grant select, insert, update on table public.budgets to authenticated;
grant select, insert on table public.expenses to authenticated;

-- The app model exposes a label and an optional paying Compte.
alter table public.expenses
  add column if not exists label text,
  add column if not exists paid_by_account_id uuid references public.accounts(id) on delete set null;

alter table public.expenses
  drop constraint if exists expenses_label_check,
  add constraint expenses_label_check check (label is null or length(trim(label)) between 1 and 160);

-- Foreign keys are checked without RLS, so make sure linked rows belong to the same Voyage.
create or replace function public.validate_itinerary_item_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.stops s where s.id = new.stop_id and s.trip_id = new.trip_id
  ) then
    raise exception 'Itinerary item stop must belong to the itinerary item trip';
  end if;
  if new.place_id is not null and not exists (
    select 1 from public.places p where p.id = new.place_id and p.trip_id = new.trip_id
  ) then
    raise exception 'Itinerary item place must belong to the itinerary item trip';
  end if;
  return new;
end;
$$;

drop trigger if exists itinerary_items_validate_links on public.itinerary_items;
create trigger itinerary_items_validate_links
before insert or update of trip_id, stop_id, place_id on public.itinerary_items
for each row execute function public.validate_itinerary_item_links();

create or replace function public.validate_place_stop_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stop_id is not null and not exists (
    select 1 from public.stops s where s.id = new.stop_id and s.trip_id = new.trip_id
  ) then
    raise exception 'Place stop must belong to the place trip';
  end if;
  return new;
end;
$$;

drop trigger if exists places_validate_stop_link on public.places;
create trigger places_validate_stop_link
before insert or update of trip_id, stop_id on public.places
for each row execute function public.validate_place_stop_link();

create or replace function public.validate_expense_payer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.paid_by_account_id is not null and not exists (
    select 1 from public.trip_members tm
    where tm.trip_id = new.trip_id and tm.account_id = new.paid_by_account_id
  ) then
    raise exception 'Expense payer must be a member of the expense trip';
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_validate_payer on public.expenses;
create trigger expenses_validate_payer
before insert or update of trip_id, paid_by_account_id on public.expenses
for each row execute function public.validate_expense_payer();

revoke all on function public.validate_itinerary_item_links() from public;
revoke all on function public.validate_place_stop_link() from public;
revoke all on function public.validate_expense_payer() from public;
