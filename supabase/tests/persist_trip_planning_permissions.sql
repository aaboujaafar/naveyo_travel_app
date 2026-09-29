-- Run with: supabase test db
begin;
select plan(9);

select ok(has_table_privilege('authenticated', 'public.stops', 'update'),
  'authenticated can update stops before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.stops', 'delete'),
  'authenticated can delete stops before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.places', 'insert'),
  'authenticated can insert places before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.places', 'update'),
  'authenticated can update places before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.budgets', 'insert'),
  'authenticated can insert budgets before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.budgets', 'update'),
  'authenticated can update budgets before editor RLS applies');
select ok(has_table_privilege('authenticated', 'public.expenses', 'insert'),
  'authenticated can insert expenses before editor RLS applies');
select has_column('public', 'expenses', 'label', 'expenses store the app label');
select has_column('public', 'expenses', 'paid_by_account_id', 'expenses store the paying Compte');

select * from finish();
rollback;
