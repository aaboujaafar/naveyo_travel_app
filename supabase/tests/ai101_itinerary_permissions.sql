begin;
select plan(4);

select ok(
  has_table_privilege('authenticated', 'public.itinerary_items', 'select'),
  'authenticated can select itinerary items before day-plan applies RLS'
);
select ok(
  has_table_privilege('authenticated', 'public.itinerary_items', 'insert'),
  'authenticated can insert itinerary items before editor RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.itinerary_items', 'update'),
  'authenticated can update itinerary items before editor RLS applies'
);
select ok(
  has_table_privilege('authenticated', 'public.itinerary_items', 'delete'),
  'authenticated can delete itinerary items before editor RLS applies'
);

select * from finish();
rollback;
