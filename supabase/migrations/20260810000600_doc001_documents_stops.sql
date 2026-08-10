-- DOC-001 corrective migration. The integrated foundation migration remains immutable.
alter table public.travel_documents
  add column if not exists stop_id uuid references public.stops(id) on delete set null;

create index if not exists travel_documents_trip_stop_idx
  on public.travel_documents(trip_id, stop_id, created_at desc);

-- Existing reservation documents inherit the Reservation's current Étape.
update public.travel_documents d
set stop_id = r.stop_id
from public.reservations r
where d.reservation_id = r.id
  and d.stop_id is null
  and r.stop_id is not null;

create or replace function public.validate_reservation_stop_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stop_id is not null and not exists (
    select 1 from public.stops s where s.id = new.stop_id and s.trip_id = new.trip_id
  ) then
    raise exception 'Reservation stop must belong to the reservation trip';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_validate_stop_link on public.reservations;
create trigger reservations_validate_stop_link
before insert or update of trip_id, stop_id on public.reservations
for each row execute function public.validate_reservation_stop_link();

create or replace function public.validate_travel_document_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation_trip uuid;
  reservation_stop uuid;
begin
  if new.stop_id is not null and not exists (
    select 1 from public.stops s where s.id = new.stop_id and s.trip_id = new.trip_id
  ) then
    raise exception 'Document stop must belong to the document trip';
  end if;

  if new.reservation_id is not null then
    select r.trip_id, r.stop_id into reservation_trip, reservation_stop
    from public.reservations r where r.id = new.reservation_id;
    if reservation_trip is null then
      raise exception 'Document reservation does not exist';
    end if;
    if reservation_trip <> new.trip_id then
      raise exception 'Document reservation must belong to the document trip';
    end if;
    if new.stop_id is null then
      new.stop_id := reservation_stop;
    elsif reservation_stop is not null and reservation_stop <> new.stop_id then
      raise exception 'Document and reservation must use the same stop';
    elsif reservation_stop is null then
      update public.reservations set stop_id = new.stop_id where id = new.reservation_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists travel_documents_validate_links on public.travel_documents;
create trigger travel_documents_validate_links
before insert or update of trip_id, stop_id, reservation_id on public.travel_documents
for each row execute function public.validate_travel_document_links();

create or replace function public.propagate_reservation_stop_to_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stop_id is distinct from old.stop_id then
    update public.travel_documents
    set stop_id = new.stop_id
    where reservation_id = new.id and stop_id is distinct from new.stop_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_propagate_stop_to_documents on public.reservations;
create trigger reservations_propagate_stop_to_documents
after update of stop_id on public.reservations
for each row execute function public.propagate_reservation_stop_to_documents();

grant select, insert, update, delete on table public.travel_documents to authenticated;
grant select, update on table public.reservations to authenticated;
