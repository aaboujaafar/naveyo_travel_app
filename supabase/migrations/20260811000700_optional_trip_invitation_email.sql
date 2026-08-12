-- Allow private invitation links that are not bound to an email address.
alter table public.trip_invitations
  alter column invited_email drop not null;

alter table public.trip_invitations
  drop constraint if exists trip_invitations_invited_email_check;

alter table public.trip_invitations
  add constraint trip_invitations_invited_email_check
  check (
    invited_email is null
    or length(trim(invited_email)) between 3 and 320
  );

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
  if auth.uid() is null then
    raise exception 'An authenticated account is required' using errcode = '42501';
  end if;

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
  if exists (
    select 1
    from public.trip_members
    where trip_id = invitation.trip_id and account_id = auth.uid()
  ) then
    raise exception 'Account is already a member of this Voyage' using errcode = '23505';
  end if;
  if invitation.invited_email is not null
     and (current_email is null or current_email <> lower(invitation.invited_email)) then
    raise exception 'Invitation email does not match the current account' using errcode = '42501';
  end if;

  insert into public.trip_members (trip_id, account_id, role)
  values (invitation.trip_id, auth.uid(), invitation.role);

  update public.trip_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id
  returning * into invitation;

  return invitation;
end;
$$;
