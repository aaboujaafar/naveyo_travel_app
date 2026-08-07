-- Collaboration invitation flow for the second adult in a Voyage.
create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  invited_email text not null check (length(trim(invited_email)) between 3 and 320),
  role public.trip_member_role not null default 'editor',
  token uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_by uuid not null references public.accounts(id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists trip_invitations_trip_idx on public.trip_invitations(trip_id, created_at desc);
create index if not exists trip_invitations_email_idx on public.trip_invitations(lower(invited_email));

alter table public.trip_invitations enable row level security;
revoke all on table public.trip_invitations from anon, authenticated;
grant select, insert on table public.trip_invitations to authenticated;

drop policy if exists trip_invitations_owner_read on public.trip_invitations;
create policy trip_invitations_owner_read
on public.trip_invitations for select to authenticated
using (public.is_trip_owner(trip_id));

drop policy if exists trip_invitations_owner_create on public.trip_invitations;
create policy trip_invitations_owner_create
on public.trip_invitations for insert to authenticated
with check (public.is_trip_owner(trip_id) and created_by = auth.uid());

create or replace function public.accept_trip_invitation(invitation_token uuid)
returns public.trip_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation public.trip_invitations;
  current_email text;
begin
  select lower(email) into current_email from auth.users where id = auth.uid();

  select * into invitation
  from public.trip_invitations
  where token = invitation_token
  for update;

  if invitation.id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;
  if invitation.status <> 'pending' or invitation.expires_at <= now() then
    raise exception 'Invitation is no longer valid' using errcode = 'P0002';
  end if;
  if current_email is null or current_email <> lower(invitation.invited_email) then
    raise exception 'Invitation email does not match the current account' using errcode = '42501';
  end if;

  insert into public.trip_members (trip_id, account_id, role)
  values (invitation.trip_id, auth.uid(), invitation.role)
  on conflict (trip_id, account_id) do nothing;

  update public.trip_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id
  returning * into invitation;

  return invitation;
end;
$$;

revoke all on function public.accept_trip_invitation(uuid) from public, anon;
grant execute on function public.accept_trip_invitation(uuid) to authenticated;
