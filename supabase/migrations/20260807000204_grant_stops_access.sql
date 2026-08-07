-- Restore the minimum privileges required by the stop creation flow.
grant select, insert on table public.stops to authenticated;
