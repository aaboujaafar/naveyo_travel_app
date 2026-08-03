-- Run with: supabase test db (requires local Supabase/Docker and pgTAP).
begin;
select plan(23);
set local role authenticated;

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
select ok((select count(*) = 1 from public.trips where id = '10000000-0000-0000-0000-000000000001'), 'owner reads trips');
select ok((select count(*) = 1 from public.trip_members where trip_id = '10000000-0000-0000-0000-000000000001'), 'owner reads members');
select ok((select count(*) = 1 from public.stops where trip_id = '10000000-0000-0000-0000-000000000001'), 'owner reads stops');
select lives_ok($$insert into public.trips (owner_account_id, name, reference_currency) values ('00000000-0000-0000-0000-000000000001', 'Owner-created', 'EUR')$$, 'owner creates trip');
select lives_ok($$update public.stops set name = 'Lisboa' where id = '30000000-0000-0000-0000-000000000001'$$, 'owner edits stop');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select ok((select count(*) = 1 from public.trips where id = '10000000-0000-0000-0000-000000000001'), 'editor reads trips');
select ok((select count(*) = 2 from public.trip_members where trip_id = '10000000-0000-0000-0000-000000000001'), 'editor reads members');
select lives_ok($$insert into public.stops (trip_id, name, country_code, timezone, local_start, local_end, sort_order) values ('10000000-0000-0000-0000-000000000001', 'Porto', 'PT', 'Europe/Lisbon', '2026-09-02', '2026-09-03', 1)$$, 'editor creates stop');
select lives_ok($$update public.trips set name = 'Editor renamed' where id = '10000000-0000-0000-0000-000000000001'$$, 'editor edits trip');
select is((select count(*) from public.trips where id = '10000000-0000-0000-0000-000000000001'), 1::bigint, 'editor cannot delete trip');

select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
select ok((select count(*) = 0 from public.trips where id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read trips');
select ok((select count(*) = 0 from public.trip_members where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read members');
select ok((select count(*) = 0 from public.trip_travelers where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read travelers links');
select ok((select count(*) = 0 from public.stops where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read stops');
select ok((select count(*) = 0 from public.places where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read places');
select ok((select count(*) = 0 from public.itinerary_items where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read itinerary');
select ok((select count(*) = 0 from public.budgets where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read budgets');
select ok((select count(*) = 0 from public.expenses where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read expenses');
select ok((select count(*) = 0 from public.reservations where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read reservations');
select ok((select count(*) = 0 from public.travel_documents where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read documents');
select ok((select count(*) = 0 from public.tracking_sessions where trip_id = '10000000-0000-0000-0000-000000000001'), 'outsider cannot read sessions');
select ok((select count(*) = 0 from public.track_points where session_id in (select id from public.tracking_sessions where trip_id = '10000000-0000-0000-0000-000000000001')), 'outsider cannot read track points');
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
select ok((select count(*) = 0 from public.accounts where id = '00000000-0000-0000-0000-000000000001'), 'editor cannot read arbitrary account');
select * from finish();
rollback;
