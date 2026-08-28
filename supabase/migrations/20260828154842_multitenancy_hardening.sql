-- Security and lifecycle hardening after the owner-only tenant migration.

alter function public.update_updated_at_column() set search_path = '';
alter function public.handle_new_user() set search_path = '';
alter function public.update_product_rating() set search_path = '';
alter function public.auto_create_category() set search_path = 'public';
alter function public.is_admin() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon, authenticated;

-- Private customer/order data must not even be discoverable through the anon GraphQL schema.
revoke all on public.audit_logs, public.cart_items, public.order_items, public.orders,
  public.profiles, public.seller_orders, public.voice_commands from anon;
grant select on public.categories, public.organizations, public.products,
  public.reviews, public.storefront_settings to anon;

drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_customer_of_store_read on public.profiles;
create policy profiles_authorized_read on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1 from public.seller_orders so
    join public.organizations o on o.id = so.organization_id
    where so.customer_id = profiles.id and o.owner_id = (select auth.uid())
  )
  or (select private.is_platform_admin())
);

drop policy if exists "Only authenticated users can insert categories" on public.categories;
drop policy if exists "Only admins can update categories" on public.categories;
drop policy if exists "Only admins can delete categories" on public.categories;
create policy categories_platform_insert on public.categories for insert to authenticated
with check ((select private.is_platform_admin()));
create policy categories_platform_update on public.categories for update to authenticated
using ((select private.is_platform_admin())) with check ((select private.is_platform_admin()));
create policy categories_platform_delete on public.categories for delete to authenticated
using ((select private.is_platform_admin()));

create or replace function public.protect_customer_order_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    new.updated_at := now();
    return new;
  end if;
  if not (select private.is_platform_admin()) then
    if old.user_id <> (select auth.uid()) then raise exception 'Order access denied'; end if;
    if new.user_id is distinct from old.user_id
      or new.total_amount is distinct from old.total_amount
      or new.payment_status is distinct from old.payment_status
      or new.payment_reference is distinct from old.payment_reference
      or new.shipping_address is distinct from old.shipping_address
      or new.seller_order_count is distinct from old.seller_order_count then
      raise exception 'Customers cannot change protected order fields';
    end if;
    if new.status is distinct from old.status and not (old.status in ('pending', 'processing') and new.status = 'cancelled') then
      raise exception 'This order can no longer be cancelled';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.protect_seller_order_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    new.updated_at := now();
    return new;
  end if;
  if not (select private.is_platform_admin()) then
    if not (select private.owns_approved_organization(old.organization_id)) then
      raise exception 'Store owner access required';
    end if;
    if new.customer_order_id is distinct from old.customer_order_id
      or new.organization_id is distinct from old.organization_id
      or new.customer_id is distinct from old.customer_id
      or new.subtotal is distinct from old.subtotal
      or new.payment_status is distinct from old.payment_status
      or new.shipping_address is distinct from old.shipping_address
      or new.payment_reference is distinct from old.payment_reference then
      raise exception 'Store owners can only update fulfillment details';
    end if;
    if new.status is distinct from old.status and not (
      (old.status = 'pending' and new.status in ('processing', 'cancelled'))
      or (old.status = 'processing' and new.status in ('shipped', 'cancelled'))
      or (old.status = 'shipped' and new.status = 'delivered')
    ) then raise exception 'Invalid seller order status transition'; end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.sync_marketplace_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare next_status public.order_status;
begin
  select case
    when bool_and(status = 'cancelled') then 'cancelled'::public.order_status
    when bool_and(status in ('delivered', 'cancelled')) then 'delivered'::public.order_status
    when bool_or(status = 'shipped') then 'shipped'::public.order_status
    when bool_or(status = 'processing') then 'processing'::public.order_status
    else 'pending'::public.order_status
  end into next_status
  from public.seller_orders where customer_order_id = new.customer_order_id;
  update public.orders set status = next_status, updated_at = now() where id = new.customer_order_id;
  return new;
end;
$$;

revoke execute on function public.sync_marketplace_order_status() from public, anon, authenticated;
drop trigger if exists sync_marketplace_order_status_trigger on public.seller_orders;
create trigger sync_marketplace_order_status_trigger
after update of status on public.seller_orders
for each row execute function public.sync_marketplace_order_status();

create or replace function public.cancel_seller_orders_with_customer_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    update public.seller_orders set status = 'cancelled', updated_at = now()
    where customer_order_id = new.id and status in ('pending', 'processing');
  end if;
  return new;
end;
$$;

revoke execute on function public.cancel_seller_orders_with_customer_order() from public, anon, authenticated;
drop trigger if exists cancel_seller_orders_with_customer_order_trigger on public.orders;
create trigger cancel_seller_orders_with_customer_order_trigger
after update of status on public.orders
for each row execute function public.cancel_seller_orders_with_customer_order();
