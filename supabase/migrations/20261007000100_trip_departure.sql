-- Where travellers start from: a home city on the account, used by default,
-- and a departure city per Voyage. Plus the number of adults travelling, so
-- searches for stays and tickets are filled in.

alter table public.accounts
  add column if not exists home_city text check (home_city is null or length(trim(home_city)) between 1 and 120),
  add column if not exists home_country char(2),
  add column if not exists home_latitude double precision check (home_latitude is null or home_latitude between -90 and 90),
  add column if not exists home_longitude double precision check (home_longitude is null or home_longitude between -180 and 180);

-- The home city is changed by its owner only, like the display name.
grant update (home_city, home_country, home_latitude, home_longitude) on table public.accounts to authenticated;

alter table public.trips
  add column if not exists departure_city text check (departure_city is null or length(trim(departure_city)) between 1 and 120),
  add column if not exists departure_country char(2),
  add column if not exists departure_latitude double precision check (departure_latitude is null or departure_latitude between -90 and 90),
  add column if not exists departure_longitude double precision check (departure_longitude is null or departure_longitude between -180 and 180),
  add column if not exists party_adults smallint check (party_adults is null or party_adults between 1 and 20);
