-- RLS policies call these helpers while running as anon/authenticated. Keep the
-- schema outside PostgREST's exposed schemas, but allow policy evaluation.
grant usage on schema private to anon, authenticated;
grant execute on function private.is_customer() to anon, authenticated;
grant execute on function private.is_platform_admin() to anon, authenticated;
grant execute on function private.owns_organization(uuid) to anon, authenticated;
grant execute on function private.owns_approved_organization(uuid) to anon, authenticated;

-- Cover foreign keys used by cart/order lookups and approval history.
create index if not exists cart_items_product_id_idx
  on public.cart_items(product_id);

create index if not exists order_items_product_id_idx
  on public.order_items(product_id);

create index if not exists organizations_approved_by_idx
  on public.organizations(approved_by)
  where approved_by is not null;
