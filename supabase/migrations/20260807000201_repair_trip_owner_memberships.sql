-- Repair owner membership for trips created before account provisioning was fixed.
insert into public.trip_members (trip_id, account_id, role)
select trips.id, trips.owner_account_id, 'owner'::public.trip_member_role
from public.trips as trips
join public.accounts as accounts on accounts.id = trips.owner_account_id
where not exists (
  select 1
  from public.trip_members as members
  where members.trip_id = trips.id
    and members.account_id = trips.owner_account_id
)
on conflict (trip_id, account_id) do nothing;
