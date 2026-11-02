-- Members of a Voyage see each other's display name, and a Voyage describes
-- its travelling party so the day planner can adapt pace and access.

-- Only the display name lives in public.accounts; e-mails stay in auth.users.
-- Privileges are granted table by table in this project: without them even
-- one's own account cannot be read. Only the display name can be changed.
grant select on table public.accounts to authenticated;
grant update (display_name) on table public.accounts to authenticated;

drop policy if exists accounts_select_co_member on public.accounts;
create policy accounts_select_co_member on public.accounts
for select to authenticated
using (
  exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.account_id = auth.uid() and theirs.account_id = accounts.id
  )
);

alter table public.trips
  add column if not exists party_children_ages smallint[] not null default '{}',
  add column if not exists party_stroller boolean not null default false,
  add column if not exists party_reduced_mobility boolean not null default false;

alter table public.trips
  drop constraint if exists trips_party_children_ages_check,
  add constraint trips_party_children_ages_check check (
    cardinality(party_children_ages) <= 8
    and 0 <= all(party_children_ages)
    and 17 >= all(party_children_ages)
  );
