-- Run with: supabase test db
begin;
select plan(13);
set local role authenticated;

select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000001',
  'role', 'authenticated'
)::text, true);

select lives_ok($$insert into public.packing_items
  (trip_id, stop_id, label, category, quantity, assigned_to)
  values ('10000000-0000-0000-0000-000000000001',
          '30000000-0000-0000-0000-000000000001',
          'Passeport', 'documents', 1,
          '00000000-0000-0000-0000-000000000002')$$,
  'owner creates an item for a trip member');
select ok((select count(*) = 1 from public.packing_items
  where trip_id = '10000000-0000-0000-0000-000000000001'),
  'owner reads packing items');
select throws_ok($$insert into public.packing_items (trip_id, label, quantity)
  values ('10000000-0000-0000-0000-000000000001', ' ', 1)$$,
  '23514', 'packing_items_label_check', 'rejects empty labels');
select throws_ok($$insert into public.packing_items (trip_id, label, quantity)
  values ('10000000-0000-0000-0000-000000000001', 'T-shirts', 100)$$,
  '23514', 'packing_items_quantity_check', 'rejects quantities above 99');

select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000002',
  'role', 'authenticated'
)::text, true);
select ok((select count(*) = 1 from public.packing_items
  where trip_id = '10000000-0000-0000-0000-000000000001'),
  'editor reads packing items');
select lives_ok($$update public.packing_items set packed = true
  where trip_id = '10000000-0000-0000-0000-000000000001'$$,
  'editor updates packing items');
select lives_ok($$insert into public.packing_items (trip_id, label, category)
  values ('10000000-0000-0000-0000-000000000001', 'Chargeur', 'electronics')$$,
  'editor creates packing items');
select throws_ok($$insert into public.packing_items (trip_id, stop_id, label)
  values ('10000000-0000-0000-0000-000000000001',
          '30000000-0000-0000-0000-000000000099', 'Invalid stop')$$,
  null, null, 'rejects a stop from another trip or missing stop');
select throws_ok($$insert into public.packing_items (trip_id, label, assigned_to)
  values ('10000000-0000-0000-0000-000000000001', 'Invalid assignee',
          '00000000-0000-0000-0000-000000000003')$$,
  null, null, 'rejects an assignee outside the trip');

select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000003',
  'role', 'authenticated'
)::text, true);
select ok((select count(*) = 0 from public.packing_items
  where trip_id = '10000000-0000-0000-0000-000000000001'),
  'outsider cannot read packing items');
select throws_ok($$insert into public.packing_items (trip_id, label)
  values ('10000000-0000-0000-0000-000000000001', 'Blocked')$$,
  '42501', null, 'outsider cannot create packing items');
select lives_ok($$delete from public.packing_items
  where trip_id = '10000000-0000-0000-0000-000000000001'$$,
  'outsider delete is filtered by RLS');

select set_config('request.jwt.claims', json_build_object(
  'sub', '00000000-0000-0000-0000-000000000001',
  'role', 'authenticated'
)::text, true);
select is((select count(*) from public.packing_items
  where trip_id = '10000000-0000-0000-0000-000000000001'),
  2::bigint, 'outsider did not delete packing items');

select * from finish();
rollback;
