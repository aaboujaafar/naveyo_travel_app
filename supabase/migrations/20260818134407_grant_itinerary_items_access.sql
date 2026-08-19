-- ITN-001 / AI-101: RLS policies already restrict rows to Voyage members,
-- but authenticated also needs table privileges before PostgREST can apply RLS.
grant select, insert, update, delete
on table public.itinerary_items
to authenticated;
