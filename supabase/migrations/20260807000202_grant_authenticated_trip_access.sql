-- RLS filters rows only after SQL table privileges are granted.
-- Restore the minimum privileges required by the trip creation flow.
grant select, insert, update on table public.trips to authenticated;
grant select, insert on table public.trip_members to authenticated;
