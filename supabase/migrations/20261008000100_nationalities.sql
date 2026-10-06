-- Nationalities decide the entry formalities of each country: the account's
-- own, and the other nationalities travelling in the Voyage's party.

alter table public.accounts
  add column if not exists nationality char(2) check (nationality is null or nationality ~ '^[A-Z]{2}$');

grant update (nationality) on table public.accounts to authenticated;

alter table public.trips
  add column if not exists party_nationalities char(2)[] not null default '{}';

alter table public.trips
  drop constraint if exists trips_party_nationalities_check,
  add constraint trips_party_nationalities_check check (cardinality(party_nationalities) <= 6);
