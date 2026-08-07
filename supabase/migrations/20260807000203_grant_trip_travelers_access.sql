-- Restore the minimum privileges required when a trip includes travelers.
grant select, insert on table public.trip_travelers to authenticated;
