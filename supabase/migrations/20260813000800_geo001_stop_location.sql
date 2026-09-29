-- GEO-001: optional geocoded location for itinerary stops.
alter table public.stops
  add column if not exists address text,
  add column if not exists provider_place_id text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists attribution text;

alter table public.stops
  drop constraint if exists stops_latitude_check,
  drop constraint if exists stops_longitude_check,
  add constraint stops_latitude_check check (latitude is null or latitude between -90 and 90),
  add constraint stops_longitude_check check (longitude is null or longitude between -180 and 180),
  add constraint stops_coordinates_pair_check check ((latitude is null) = (longitude is null));

create index if not exists stops_provider_place_idx
  on public.stops (trip_id, provider_place_id)
  where provider_place_id is not null;
