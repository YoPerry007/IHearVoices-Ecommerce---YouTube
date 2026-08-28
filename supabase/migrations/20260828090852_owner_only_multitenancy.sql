-- Owner-only multitenancy for the IHearVoices marketplace.
-- Customers shop across approved stores. Store owners manage only their store.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin
  create type public.organization_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.organizations (
  id uuid primary key default extensions.uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  contact_email text,
  phone text,
  location text,
  logo_url text,
  banner_url text,
  status public.organization_status not null default 'pending',
  rejection_reason text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists organizations_one_store_per_owner_idx
  on public.organizations(owner_id) where owner_id is not null;
create index if not exists organizations_status_idx on public.organizations(status);
create index if not exists organizations_approved_created_idx
  on public.organizations(created_at desc) where status = 'approved';

create table if not exists public.storefront_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  accent_color text not null default '#8B5CF6',
  return_policy text,
  shipping_policy text,
  support_email text,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_orders (
  id uuid primary key default extensions.uuid_generate_v4(),
  customer_order_id uuid not null references public.orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null references auth.users(id) on delete restrict,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  shipping_address jsonb not null,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_order_id, organization_id)
);

create index if not exists seller_orders_organization_created_idx
  on public.seller_orders(organization_id, created_at desc);
create index if not exists seller_orders_customer_idx on public.seller_orders(customer_id);
create index if not exists seller_orders_parent_idx on public.seller_orders(customer_order_id);
create index if not exists seller_orders_open_idx
  on public.seller_orders(organization_id, created_at desc)
  where status in ('pending', 'processing', 'shipped');

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs(organization_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);

alter table public.products
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists status public.product_status not null default 'published';
alter table public.orders
  add column if not exists seller_order_count integer not null default 1 check (seller_order_count > 0);
alter table public.order_items
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict,
  add column if not exists seller_order_id uuid references public.seller_orders(id) on delete cascade;
alter table public.cart_items
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;
alter table public.reviews
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

-- Preserve all existing marketplace data under a platform-owned default store.
insert into public.organizations (id, owner_id, name, slug, description, contact_email, status, approved_at)
values (
  extensions.uuid_generate_v5(extensions.uuid_ns_url(), 'ihearvoices://default-organization'),
  null,
  'IHearVoices',
  'ihearvoices',
  'The original IHearVoices marketplace storefront.',
  'perrycodesy@gmail.com',
  'approved',
  now()
)
on conflict (slug) do update set status = 'approved', approved_at = coalesce(public.organizations.approved_at, now());

insert into public.storefront_settings (organization_id)
select id from public.organizations where slug = 'ihearvoices'
on conflict (organization_id) do nothing;

update public.products
set organization_id = (select id from public.organizations where slug = 'ihearvoices')
where organization_id is null;

update public.cart_items ci
set organization_id = p.organization_id
from public.products p
where ci.product_id = p.id and ci.organization_id is null;

update public.reviews r
set organization_id = p.organization_id
from public.products p
where r.product_id = p.id and r.organization_id is null;

insert into public.seller_orders (
  customer_order_id, organization_id, customer_id, subtotal, status,
  payment_status, shipping_address, payment_reference, notes, created_at, updated_at
)
select
  o.id,
  (select id from public.organizations where slug = 'ihearvoices'),
  o.user_id,
  o.total_amount,
  o.status,
  o.payment_status,
  o.shipping_address,
  o.payment_reference,
  o.notes,
  coalesce(o.created_at, now()),
  coalesce(o.updated_at, now())
from public.orders o
on conflict (customer_order_id, organization_id) do nothing;

update public.order_items oi
set organization_id = p.organization_id,
    seller_order_id = so.id
from public.products p, public.seller_orders so
where oi.product_id = p.id
  and so.customer_order_id = oi.order_id
  and so.organization_id = p.organization_id
  and (oi.organization_id is null or oi.seller_order_id is null);

alter table public.products alter column organization_id set not null;
alter table public.order_items alter column organization_id set not null;
alter table public.order_items alter column seller_order_id set not null;
alter table public.cart_items alter column organization_id set not null;
alter table public.reviews alter column organization_id set not null;

create index if not exists products_organization_idx on public.products(organization_id);
create index if not exists products_public_catalog_idx
  on public.products(organization_id, category, created_at desc)
  where status = 'published' and in_stock = true;
create index if not exists order_items_organization_idx on public.order_items(organization_id);
create index if not exists order_items_seller_order_idx on public.order_items(seller_order_id);
create index if not exists cart_items_organization_idx on public.cart_items(organization_id);
create index if not exists reviews_organization_idx on public.reviews(organization_id);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.owns_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations
    where id = target_organization_id and owner_id = (select auth.uid())
  );
$$;

create or replace function private.owns_approved_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organizations
    where id = target_organization_id
      and owner_id = (select auth.uid())
      and status = 'approved'
  );
$$;

create or replace function private.is_customer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
    and not exists (
      select 1 from public.organizations
      where owner_id = (select auth.uid())
    );
$$;

revoke execute on function private.is_platform_admin() from public, anon, authenticated;
revoke execute on function private.owns_organization(uuid) from public, anon, authenticated;
revoke execute on function private.owns_approved_organization(uuid) from public, anon, authenticated;
revoke execute on function private.is_customer() from public, anon, authenticated;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not (select private.is_platform_admin()) then
    new.role := 'user';
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role and not (select private.is_platform_admin()) then
    raise exception 'Only platform administrators can change account roles';
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_role() from public, anon, authenticated;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.protect_organization_system_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_platform_admin()) then
    if new.owner_id is distinct from old.owner_id
      or new.status is distinct from old.status
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only platform administrators can change store ownership or approval state';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.protect_organization_system_fields() from public, anon, authenticated;

drop trigger if exists protect_organization_system_fields_trigger on public.organizations;
create trigger protect_organization_system_fields_trigger
before update on public.organizations
for each row execute function public.protect_organization_system_fields();

create or replace function public.initialize_storefront_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.storefront_settings(organization_id) values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.initialize_storefront_settings() from public, anon, authenticated;
drop trigger if exists initialize_storefront_settings_trigger on public.organizations;
create trigger initialize_storefront_settings_trigger
after insert on public.organizations
for each row execute function public.initialize_storefront_settings();

create or replace function public.assign_product_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare product_organization_id uuid;
begin
  select p.organization_id into product_organization_id
  from public.products p join public.organizations o on o.id = p.organization_id
  where p.id = new.product_id and p.status = 'published' and o.status = 'approved';
  if product_organization_id is null then raise exception 'Product is not available'; end if;
  new.organization_id := product_organization_id;
  return new;
end;
$$;

revoke execute on function public.assign_product_organization() from public, anon, authenticated;
drop trigger if exists assign_cart_product_organization_trigger on public.cart_items;
create trigger assign_cart_product_organization_trigger
before insert or update of product_id on public.cart_items
for each row execute function public.assign_product_organization();
drop trigger if exists assign_review_product_organization_trigger on public.reviews;
create trigger assign_review_product_organization_trigger
before insert or update of product_id on public.reviews
for each row execute function public.assign_product_organization();

create or replace function public.protect_customer_order_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

revoke execute on function public.protect_customer_order_fields() from public, anon, authenticated;
drop trigger if exists protect_customer_order_fields_trigger on public.orders;
create trigger protect_customer_order_fields_trigger
before update on public.orders
for each row execute function public.protect_customer_order_fields();

create or replace function public.protect_seller_order_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
  end if;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.protect_seller_order_fields() from public, anon, authenticated;
drop trigger if exists protect_seller_order_fields_trigger on public.seller_orders;
create trigger protect_seller_order_fields_trigger
before update on public.seller_orders
for each row execute function public.protect_seller_order_fields();

create or replace function public.review_store_application(
  target_organization_id uuid,
  new_status public.organization_status,
  reason text default null
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare reviewed public.organizations;
begin
  if not (select private.is_platform_admin()) then
    raise exception 'Platform administrator access required';
  end if;
  if new_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Invalid review status';
  end if;
  update public.organizations
  set status = new_status,
      rejection_reason = case when new_status in ('rejected', 'suspended') then nullif(trim(reason), '') else null end,
      approved_by = case when new_status = 'approved' then (select auth.uid()) else approved_by end,
      approved_at = case when new_status = 'approved' then now() else approved_at end,
      updated_at = now()
  where id = target_organization_id
  returning * into reviewed;
  if reviewed.id is null then raise exception 'Store not found'; end if;
  insert into public.audit_logs(organization_id, actor_id, action, entity_type, entity_id, details)
  values (reviewed.id, (select auth.uid()), 'store_reviewed', 'organization', reviewed.id::text,
          jsonb_build_object('status', new_status, 'reason', reason));
  return reviewed;
end;
$$;

revoke execute on function public.review_store_application(uuid, public.organization_status, text) from public, anon;
grant execute on function public.review_store_application(uuid, public.organization_status, text) to authenticated;

create or replace function public.create_marketplace_order(
  p_items jsonb,
  p_shipping_address jsonb,
  p_payment_reference text default null,
  p_payment_status public.payment_status default 'pending',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_order_id uuid;
  existing_order_id uuid;
  calculated_total numeric(10,2);
  organization_record record;
  item_record record;
  new_seller_order_id uuid;
begin
  if caller_id is null or not (select private.is_customer()) then
    raise exception 'Customer access required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one order item is required';
  end if;
  if p_payment_reference is not null then
    select id into existing_order_id from public.orders
    where payment_reference = p_payment_reference and user_id = caller_id limit 1;
    if existing_order_id is not null then return existing_order_id; end if;
  end if;

  create temporary table if not exists pg_temp.validated_order_items (
    product_id uuid, organization_id uuid, quantity integer, unit_price numeric(10,2), size text, color text
  ) on commit drop;
  truncate pg_temp.validated_order_items;

  for item_record in
    select value from jsonb_array_elements(p_items)
  loop
    insert into pg_temp.validated_order_items(product_id, organization_id, quantity, unit_price, size, color)
    select p.id, p.organization_id,
           greatest(1, coalesce((item_record.value->>'quantity')::integer, 1)),
           round((p.price * (1 - coalesce(p.discount_percentage, 0)::numeric / 100)), 2),
           nullif(item_record.value->>'size', ''), nullif(item_record.value->>'color', '')
    from public.products p
    join public.organizations o on o.id = p.organization_id
    where p.id = (item_record.value->>'product_id')::uuid
      and p.status = 'published' and p.in_stock = true
      and p.stock_count >= greatest(1, coalesce((item_record.value->>'quantity')::integer, 1))
      and o.status = 'approved'
    for update of p;
    if not found then raise exception 'A product is unavailable or has insufficient stock'; end if;
  end loop;

  select round(sum(unit_price * quantity), 2) into calculated_total from pg_temp.validated_order_items;
  insert into public.orders(user_id, total_amount, status, payment_status, shipping_address, payment_reference, notes, seller_order_count)
  values (caller_id, calculated_total, 'pending', p_payment_status, p_shipping_address, p_payment_reference, p_notes,
          (select count(distinct organization_id) from pg_temp.validated_order_items))
  returning id into new_order_id;

  for organization_record in
    select organization_id, round(sum(unit_price * quantity), 2) subtotal
    from pg_temp.validated_order_items group by organization_id
  loop
    insert into public.seller_orders(customer_order_id, organization_id, customer_id, subtotal, status,
      payment_status, shipping_address, payment_reference, notes)
    values (new_order_id, organization_record.organization_id, caller_id, organization_record.subtotal,
      'pending', p_payment_status, p_shipping_address, p_payment_reference, p_notes)
    returning id into new_seller_order_id;

    insert into public.order_items(order_id, seller_order_id, organization_id, product_id, quantity, price, size, color)
    select new_order_id, new_seller_order_id, organization_id, product_id, quantity, unit_price, size, color
    from pg_temp.validated_order_items where organization_id = organization_record.organization_id;
  end loop;

  update public.products p
  set stock_count = p.stock_count - totals.quantity,
      in_stock = (p.stock_count - totals.quantity) > 0,
      updated_at = now()
  from (select product_id, sum(quantity)::integer quantity from pg_temp.validated_order_items group by product_id) totals
  where p.id = totals.product_id;

  return new_order_id;
end;
$$;

revoke execute on function public.create_marketplace_order(jsonb, jsonb, text, public.payment_status, text) from public, anon;
grant execute on function public.create_marketplace_order(jsonb, jsonb, text, public.payment_status, text) to authenticated;

-- Replace legacy broad policies with explicit owner/customer/platform policies.
do $$ declare pol record; begin
  for pol in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in
      ('profiles','products','orders','order_items','cart_items','reviews','voice_commands')
  loop execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename); end loop;
end $$;

alter table public.organizations enable row level security;
alter table public.storefront_settings enable row level security;
alter table public.seller_orders enable row level security;
alter table public.audit_logs enable row level security;

create policy organizations_public_read on public.organizations for select to anon, authenticated
using (status = 'approved' or owner_id = (select auth.uid()) or (select private.is_platform_admin()));
create policy organizations_customer_apply on public.organizations for insert to authenticated
with check (owner_id = (select auth.uid()) and status = 'pending' and not (select private.is_platform_admin()));
create policy organizations_owner_update on public.organizations for update to authenticated
using (owner_id = (select auth.uid()) or (select private.is_platform_admin()))
with check (owner_id = (select auth.uid()) or (select private.is_platform_admin()));

create policy storefront_public_read on public.storefront_settings for select to anon, authenticated
using (is_visible and exists(select 1 from public.organizations o where o.id = organization_id and o.status = 'approved')
  or (select private.owns_organization(organization_id)) or (select private.is_platform_admin()));
create policy storefront_owner_insert on public.storefront_settings for insert to authenticated
with check ((select private.owns_organization(organization_id)) or (select private.is_platform_admin()));
create policy storefront_owner_update on public.storefront_settings for update to authenticated
using ((select private.owns_organization(organization_id)) or (select private.is_platform_admin()))
with check ((select private.owns_organization(organization_id)) or (select private.is_platform_admin()));

create policy profiles_self_read on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_customer_of_store_read on public.profiles for select to authenticated
using (exists(select 1 from public.seller_orders so join public.organizations o on o.id = so.organization_id
  where so.customer_id = profiles.id and o.owner_id = (select auth.uid())) or (select private.is_platform_admin()));
create policy profiles_self_insert on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and role = 'user');
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid()) or (select private.is_platform_admin()))
with check (id = (select auth.uid()) or (select private.is_platform_admin()));

create policy products_public_catalog_read on public.products for select to anon, authenticated
using ((status = 'published' and exists(select 1 from public.organizations o
  where o.id = products.organization_id and o.status = 'approved'))
  or (select private.owns_organization(organization_id)) or (select private.is_platform_admin()));
create policy products_owner_insert on public.products for insert to authenticated
with check ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()));
create policy products_owner_update on public.products for update to authenticated
using ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()))
with check ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()));
create policy products_owner_delete on public.products for delete to authenticated
using ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()));

create policy customer_orders_self_read on public.orders for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_platform_admin()));
create policy customer_orders_self_update on public.orders for update to authenticated
using (user_id = (select auth.uid()) or (select private.is_platform_admin()))
with check (user_id = (select auth.uid()) or (select private.is_platform_admin()));

create policy seller_orders_customer_read on public.seller_orders for select to authenticated
using (customer_id = (select auth.uid()) or (select private.owns_organization(organization_id)) or (select private.is_platform_admin()));
create policy seller_orders_owner_update on public.seller_orders for update to authenticated
using ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()))
with check ((select private.owns_approved_organization(organization_id)) or (select private.is_platform_admin()));

create policy order_items_customer_or_owner_read on public.order_items for select to authenticated
using (exists(select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid()))
  or (select private.owns_organization(organization_id)) or (select private.is_platform_admin()));

create policy cart_customer_all on public.cart_items for all to authenticated
using (user_id = (select auth.uid()) and (select private.is_customer()))
with check (user_id = (select auth.uid()) and (select private.is_customer())
  and exists(select 1 from public.products p join public.organizations o on o.id = p.organization_id
    where p.id = product_id and p.organization_id = cart_items.organization_id
      and p.status = 'published' and p.in_stock = true and o.status = 'approved'));

create policy reviews_public_read on public.reviews for select to anon, authenticated
using (exists(select 1 from public.products p join public.organizations o on o.id = p.organization_id
  where p.id = product_id and p.organization_id = reviews.organization_id
    and p.status = 'published' and o.status = 'approved')
  or (select private.owns_organization(organization_id)) or (select private.is_platform_admin()));
create policy reviews_customer_insert on public.reviews for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.is_customer()));
create policy reviews_customer_update on public.reviews for update to authenticated
using (user_id = (select auth.uid()) and (select private.is_customer()))
with check (user_id = (select auth.uid()) and (select private.is_customer()));
create policy reviews_customer_delete on public.reviews for delete to authenticated
using (user_id = (select auth.uid()) and (select private.is_customer()));

create policy voice_customer_insert on public.voice_commands for insert to authenticated
with check (user_id = (select auth.uid()) and (select private.is_customer()));
create policy voice_customer_read on public.voice_commands for select to authenticated
using (user_id = (select auth.uid()) and (select private.is_customer()));

create policy audit_owner_read on public.audit_logs for select to authenticated
using ((organization_id is not null and (select private.owns_organization(organization_id)))
  or (select private.is_platform_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.storefront_settings to anon, authenticated;
grant insert, update on public.organizations, public.storefront_settings to authenticated;
grant select, insert, update, delete on public.products, public.cart_items, public.reviews to authenticated;
grant select, update on public.orders, public.seller_orders to authenticated;
grant select on public.order_items, public.audit_logs to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.voice_commands to authenticated;

-- Profiles retain only platform-level user/admin values. Store ownership is derived from organizations.owner_id.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'admin'));
