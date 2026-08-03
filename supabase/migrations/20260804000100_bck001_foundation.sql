-- BCK-001: Naveyo P0 schema and RLS. Safe to replay on a fresh database.
create extension if not exists pgcrypto;

do $$ begin
  create type public.trip_member_role as enum ('owner', 'editor');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.document_status as enum ('pending', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.tracking_session_status as enum ('active', 'stopped');
exception when duplicate_object then null; end $$;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  created_at timestamptz not null default now()
);
create table if not exists public.travelers (
  id uuid primary key default gen_random_uuid(), account_id uuid references public.accounts(id) on delete set null,
  full_name text not null check (length(trim(full_name)) between 1 and 120), created_at timestamptz not null default now()
);
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(), owner_account_id uuid not null references public.accounts(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 160),
  reference_currency char(3) not null check (reference_currency in ('EUR','USD','GBP','CHF','CAD','AUD','JPY')),
  starts_on date, ends_on date, created_at timestamptz not null default now(), check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  role public.trip_member_role not null, created_at timestamptz not null default now(), primary key (trip_id, account_id)
);
create table if not exists public.trip_travelers (
  trip_id uuid not null references public.trips(id) on delete cascade,
  traveler_id uuid not null references public.travelers(id) on delete cascade, created_at timestamptz not null default now(), primary key (trip_id, traveler_id)
);
create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null, country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'), timezone text not null,
  local_start date not null, local_end date not null, sort_order integer not null default 0, created_at timestamptz not null default now(),
  check (local_end >= local_start), unique (trip_id, sort_order)
);
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid references public.stops(id) on delete set null, provider text not null, provider_place_id text,
  name text not null, kind text not null check (kind in ('venue','meeting_point','origin','destination')), address text,
  country_code char(2) check (country_code is null or country_code ~ '^[A-Z]{2}$'), latitude double precision check (latitude between -90 and 90), longitude double precision check (longitude between -180 and 180), attribution text, provider_payload jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique (trip_id, provider, provider_place_id)
);
create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid not null references public.stops(id) on delete cascade, place_id uuid references public.places(id) on delete set null,
  title text not null, item_type text not null check (item_type in ('place','transport','reservation','note')), local_date date not null, local_time time, timezone text not null, notes text, sort_order integer not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.budgets (
  trip_id uuid primary key references public.trips(id) on delete cascade, amount_minor bigint not null check (amount_minor >= 0), currency char(3) not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade, paid_by_traveler_id uuid references public.travelers(id) on delete set null,
  amount_minor bigint not null check (amount_minor >= 0), currency char(3) not null, reference_amount_minor bigint check (reference_amount_minor is null or reference_amount_minor >= 0), reference_currency char(3), exchange_rate numeric(20,10), exchange_rate_date date, exchange_rate_source text, category text not null, spent_on date not null, note text, created_at timestamptz not null default now(), check (reference_amount_minor is null or (exchange_rate_date is not null and exchange_rate_source is not null))
);
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade, stop_id uuid references public.stops(id) on delete set null,
  kind text not null check (kind in ('lodging','flight','train','ferry','activity','restaurant','other')), status public.document_status not null default 'pending', provider_name text, confirmation_reference text, venue_name text, origin_place_id uuid references public.places(id) on delete set null, destination_place_id uuid references public.places(id) on delete set null, starts_at timestamptz, ends_at timestamptz, local_timezone text, source_url text check (source_url is null or source_url ~ '^https?://'), structured_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.travel_documents (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade, reservation_id uuid references public.reservations(id) on delete set null, storage_path text not null unique, mime_type text not null check (mime_type in ('application/pdf','image/jpeg','image/png','text/calendar','text/plain')), byte_size bigint not null check (byte_size > 0 and byte_size <= 26214400), checksum text, status public.document_status not null default 'pending', original_filename text, created_at timestamptz not null default now()
);
create table if not exists public.tracking_sessions (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade, started_by uuid not null references public.accounts(id) on delete restrict, status public.tracking_session_status not null default 'active', started_at timestamptz not null default now(), stopped_at timestamptz, check (stopped_at is null or stopped_at >= started_at)
);
create table if not exists public.track_points (
  id uuid primary key default gen_random_uuid(), session_id uuid not null references public.tracking_sessions(id) on delete cascade, idempotency_key text not null, recorded_at_utc timestamptz not null, latitude double precision not null check (latitude between -90 and 90), longitude double precision not null check (longitude between -180 and 180), accuracy_m double precision not null check (accuracy_m >= 0), created_at timestamptz not null default now(), unique (session_id, idempotency_key)
);

create index if not exists trip_members_account_idx on public.trip_members(account_id);
create index if not exists stops_trip_idx on public.stops(trip_id, sort_order);
create index if not exists itinerary_trip_idx on public.itinerary_items(trip_id, local_date, local_time, sort_order);
create index if not exists track_points_session_idx on public.track_points(session_id, recorded_at_utc);

create or replace function public.is_trip_member(target_trip uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.trip_members where trip_id = target_trip and account_id = auth.uid()) $$;
create or replace function public.can_edit_trip(target_trip uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.trip_members where trip_id = target_trip and account_id = auth.uid() and role in ('owner','editor')) $$;
create or replace function public.is_trip_owner(target_trip uuid) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.trip_members where trip_id = target_trip and account_id = auth.uid() and role = 'owner') $$;
create or replace function public.trip_id_for_session(target_session uuid) returns uuid language sql stable security definer set search_path = public as $$ select trip_id from public.tracking_sessions where id = target_session $$;
create or replace function public.add_trip_owner_membership() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, account_id, role) values (new.id, new.owner_account_id, 'owner') on conflict (trip_id, account_id) do nothing;
  return new;
end $$;
drop trigger if exists trips_add_owner_membership on public.trips;
create trigger trips_add_owner_membership after insert on public.trips for each row execute function public.add_trip_owner_membership();
revoke all on function public.is_trip_member(uuid), public.can_edit_trip(uuid), public.is_trip_owner(uuid), public.trip_id_for_session(uuid) from public;
revoke all on function public.add_trip_owner_membership() from public;
grant execute on function public.is_trip_member(uuid), public.can_edit_trip(uuid), public.is_trip_owner(uuid), public.trip_id_for_session(uuid) to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['accounts','travelers','trips','trip_members','trip_travelers','stops','places','itinerary_items','budgets','expenses','reservations','travel_documents','tracking_sessions','track_points'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
  end loop;
end $$;

drop policy if exists accounts_select_self on public.accounts;
create policy accounts_select_self on public.accounts for select to authenticated using (id = auth.uid());
drop policy if exists accounts_update_self on public.accounts;
create policy accounts_update_self on public.accounts for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists trips_select_member on public.trips;
create policy trips_select_member on public.trips for select to authenticated using (public.is_trip_member(id));
drop policy if exists trips_insert_owner on public.trips;
create policy trips_insert_owner on public.trips for insert to authenticated with check (owner_account_id = auth.uid());
drop policy if exists trips_update_editor on public.trips;
create policy trips_update_editor on public.trips for update to authenticated using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
drop policy if exists trips_delete_owner on public.trips;
create policy trips_delete_owner on public.trips for delete to authenticated using (public.is_trip_owner(id));
drop policy if exists trip_members_select_member on public.trip_members;
create policy trip_members_select_member on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists trip_members_owner_write on public.trip_members;
create policy trip_members_owner_write on public.trip_members for all to authenticated using (public.is_trip_owner(trip_id)) with check (public.is_trip_owner(trip_id));
drop policy if exists travelers_select_member on public.travelers;
create policy travelers_select_member on public.travelers for select to authenticated using (account_id = auth.uid() or exists (select 1 from public.trip_travelers tt where tt.traveler_id = id and public.is_trip_member(tt.trip_id)));
drop policy if exists travelers_editor_write on public.travelers;
create policy travelers_editor_write on public.travelers for all to authenticated using (account_id = auth.uid() or exists (select 1 from public.trip_travelers tt where tt.traveler_id = id and public.can_edit_trip(tt.trip_id))) with check (account_id = auth.uid());
drop policy if exists trip_travelers_select_member on public.trip_travelers;
create policy trip_travelers_select_member on public.trip_travelers for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists trip_travelers_editor_write on public.trip_travelers;
create policy trip_travelers_editor_write on public.trip_travelers for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id));

do $$ declare table_name text; begin
  foreach table_name in array array['stops','places','itinerary_items','budgets','expenses','reservations','travel_documents'] loop
    execute format('drop policy if exists %I_select_member on public.%I', table_name, table_name);
    execute format('create policy %I_select_member on public.%I for select to authenticated using (public.is_trip_member(trip_id))', table_name, table_name);
    execute format('drop policy if exists %I_editor_write on public.%I', table_name, table_name);
    execute format('create policy %I_editor_write on public.%I for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))', table_name, table_name);
  end loop;
end $$;
drop policy if exists tracking_sessions_select_member on public.tracking_sessions;
create policy tracking_sessions_select_member on public.tracking_sessions for select to authenticated using (public.is_trip_member(trip_id));
drop policy if exists tracking_sessions_editor_write on public.tracking_sessions;
create policy tracking_sessions_editor_write on public.tracking_sessions for all to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id) and started_by = auth.uid());
drop policy if exists track_points_select_member on public.track_points;
create policy track_points_select_member on public.track_points for select to authenticated using (public.is_trip_member(public.trip_id_for_session(session_id)));
drop policy if exists track_points_editor_write on public.track_points;
create policy track_points_editor_write on public.track_points for all to authenticated using (public.can_edit_trip(public.trip_id_for_session(session_id))) with check (public.can_edit_trip(public.trip_id_for_session(session_id)));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('trip-documents', 'trip-documents', false, 26214400, array['application/pdf','image/jpeg','image/png','text/calendar','text/plain']) on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists trip_documents_read on storage.objects;
create policy trip_documents_read on storage.objects for select to authenticated using (bucket_id = 'trip-documents' and public.is_trip_member((storage.foldername(name))[1]::uuid));
drop policy if exists trip_documents_insert on storage.objects;
create policy trip_documents_insert on storage.objects for insert to authenticated with check (bucket_id = 'trip-documents' and public.can_edit_trip((storage.foldername(name))[1]::uuid));
drop policy if exists trip_documents_update on storage.objects;
create policy trip_documents_update on storage.objects for update to authenticated using (bucket_id = 'trip-documents' and public.can_edit_trip((storage.foldername(name))[1]::uuid)) with check (bucket_id = 'trip-documents' and public.can_edit_trip((storage.foldername(name))[1]::uuid));
drop policy if exists trip_documents_delete on storage.objects;
create policy trip_documents_delete on storage.objects for delete to authenticated using (bucket_id = 'trip-documents' and public.can_edit_trip((storage.foldername(name))[1]::uuid));
