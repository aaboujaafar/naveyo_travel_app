-- Corrective migration: provision the private account row used by trip RLS.
create or replace function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preferred_name text;
begin
  preferred_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
  preferred_name := left(coalesce(preferred_name, split_part(coalesce(new.email, 'Naveyo user'), '@', 1)), 120);

  insert into public.accounts (id, display_name)
  values (new.id, coalesce(nullif(preferred_name, ''), 'Naveyo user'))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_account();

-- Repair accounts for users created before this trigger was installed.
insert into public.accounts (id, display_name)
select
  users.id,
  left(coalesce(nullif(trim(users.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(users.email, 'Naveyo user'), '@', 1), 'Naveyo user'), 120)
from auth.users as users
where not exists (
  select 1 from public.accounts as accounts where accounts.id = users.id
)
on conflict (id) do nothing;
