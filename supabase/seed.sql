-- Local-only deterministic fixture. Never reuse these credentials remotely.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@naveyo.test', crypt('owner-password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'editor@naveyo.test', crypt('editor-password', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@naveyo.test', crypt('outsider-password', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;
insert into public.accounts (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'Naveyo Owner'),
  ('00000000-0000-0000-0000-000000000002', 'Naveyo Editor'),
  ('00000000-0000-0000-0000-000000000003', 'Outside Account')
on conflict (id) do nothing;
insert into public.trips (id, owner_account_id, name, reference_currency, starts_on, ends_on)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Fixture trip', 'EUR', '2026-09-01', '2026-09-10') on conflict (id) do nothing;
insert into public.trip_members (trip_id, account_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'editor') on conflict (trip_id, account_id) do update set role = excluded.role;
insert into public.travelers (id, account_id, full_name) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Owner Traveler'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Editor Traveler') on conflict (id) do nothing;
insert into public.trip_travelers (trip_id, traveler_id) values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002') on conflict do nothing;
insert into public.stops (id, trip_id, name, country_code, timezone, local_start, local_end, sort_order)
values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lisbon', 'PT', 'Europe/Lisbon', '2026-09-01', '2026-09-10', 0) on conflict (id) do nothing;
