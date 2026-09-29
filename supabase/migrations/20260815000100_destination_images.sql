alter table public.stops
  add column if not exists image_url text
  check (image_url is null or image_url ~ '^https?://');
