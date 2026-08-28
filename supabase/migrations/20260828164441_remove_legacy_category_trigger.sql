-- Product categories are stored as text. Categories themselves remain
-- platform-managed, so seller product writes must not attempt to modify them.
drop trigger if exists trigger_auto_create_category on public.products;
drop function if exists public.auto_create_category();
