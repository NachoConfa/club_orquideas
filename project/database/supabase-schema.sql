-- Supabase setup for the current Modo Plantas schema.
-- This script is non-destructive: it does not drop tables or delete data.

-- Expected existing tables:
-- public.products(id uuid, name text, description text, price numeric, stock int4,
--   orchid_type text, color text, size text, image_url text, is_active bool, ...)
-- public.profiles(id uuid, full_name text, phone text, address text, role text, ...)

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists role text default 'customer';
alter table public.profiles add column if not exists created_at timestamptz default now();

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role = 'admin'
  );
$$;

-- Minimal columns used by the frontend checkout and admin dashboard.
-- Safe to run more than once: every column is added only if it does not exist.
alter table public.orders add column if not exists id uuid default gen_random_uuid();
alter table public.orders add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists order_number text;
alter table public.orders add column if not exists subtotal numeric default 0;
alter table public.orders add column if not exists shipping numeric default 0;
alter table public.orders add column if not exists total_amount numeric default 0;
alter table public.orders add column if not exists total numeric default 0;
alter table public.orders add column if not exists payment_fee numeric not null default 0;
alter table public.orders add column if not exists status text default 'pending';
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists payment_status text default 'pending';
alter table public.orders add column if not exists mercadopago_preference_id text;
alter table public.orders add column if not exists mercadopago_payment_id text;
alter table public.orders add column if not exists mercadopago_payment_status text;
alter table public.orders add column if not exists delivery_method text;
alter table public.orders add column if not exists shipping_method text;
alter table public.orders add column if not exists shipping_total numeric default 0;
alter table public.orders add column if not exists shipping_address text;
alter table public.orders add column if not exists billing_address text;
alter table public.orders add column if not exists city text;
alter table public.orders add column if not exists province text;
alter table public.orders add column if not exists postal_code text;
alter table public.orders add column if not exists shipping_zone_id uuid;
alter table public.orders add column if not exists shipping_zone_name text;
alter table public.orders add column if not exists shipping_requires_quote boolean default false;
alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists notes text;
alter table public.orders add column if not exists stock_deducted boolean not null default false;
alter table public.orders add column if not exists stock_deducted_at timestamptz;
alter table public.orders add column if not exists order_received_email_sent_at timestamptz;
alter table public.orders add column if not exists order_confirmed_email_sent_at timestamptz;
alter table public.orders add column if not exists order_cancelled_email_sent_at timestamptz;
alter table public.orders add column if not exists created_at timestamptz default now();
alter table public.orders add column if not exists updated_at timestamptz default now();

create unique index if not exists orders_order_number_key on public.orders(order_number);
create index if not exists orders_user_id_idx on public.orders(user_id);

alter table public.products add column if not exists attributes jsonb not null default '{}'::jsonb;
create index if not exists products_attributes_gin_idx on public.products using gin (attributes);

alter table public.order_items add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.order_items add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.order_items add column if not exists product_name text;
alter table public.order_items add column if not exists product_image text;
alter table public.order_items add column if not exists quantity int4 default 1;
alter table public.order_items add column if not exists unit_price numeric default 0;
alter table public.order_items add column if not exists subtotal numeric default 0;
alter table public.order_items add column if not exists total_price numeric default 0;
alter table public.order_items add column if not exists product_details jsonb default '{}'::jsonb;
alter table public.order_items add column if not exists created_at timestamptz default now();

create index if not exists order_items_order_id_idx on public.order_items(order_id);

alter table public.payments add column if not exists order_id uuid references public.orders(id) on delete cascade;
alter table public.payments add column if not exists amount numeric default 0;
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists status text default 'pending';
alter table public.payments add column if not exists payment_status text default 'pending';
alter table public.payments add column if not exists preference_id text;
alter table public.payments add column if not exists provider_payment_id text;
alter table public.payments add column if not exists created_at timestamptz default now();

create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  province text,
  city_keywords text[] not null default '{}',
  method text not null check (method in ('uber', 'encomienda')),
  price numeric not null default 0,
  requires_quote boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.shipping_zones (name, province, city_keywords, method, price, requires_quote, sort_order)
select 'Nordelta / Tigre cercano', 'Buenos Aires', array['nordelta', 'tigre', 'benavidez', 'dique lujan', 'los sauces'], 'uber', 3000, false, 10
where not exists (select 1 from public.shipping_zones where name = 'Nordelta / Tigre cercano');

insert into public.shipping_zones (name, province, city_keywords, method, price, requires_quote, sort_order)
select 'Zona Norte media', 'Buenos Aires', array['san fernando', 'victoria', 'san isidro', 'martinez', 'olivos', 'beccar'], 'uber', 6000, false, 20
where not exists (select 1 from public.shipping_zones where name = 'Zona Norte media');

insert into public.shipping_zones (name, province, city_keywords, method, price, requires_quote, sort_order)
select 'CABA', 'CABA', array['caba', 'capital federal', 'palermo', 'belgrano', 'recoleta', 'caballito'], 'uber', 16000, false, 30
where not exists (select 1 from public.shipping_zones where name = 'CABA');

insert into public.shipping_zones (name, province, city_keywords, method, price, requires_quote, sort_order)
select 'Interior del pais', null, array['cordoba', 'santa fe', 'mendoza', 'tucuman', 'salta', 'neuquen', 'rio negro'], 'encomienda', 0, true, 50
where not exists (select 1 from public.shipping_zones where name = 'Interior del pais');

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_images add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.product_images add column if not exists image_url text;
alter table public.product_images add column if not exists alt_text text;
alter table public.product_images add column if not exists sort_order int not null default 0;
alter table public.product_images add column if not exists is_active boolean not null default true;
alter table public.product_images add column if not exists created_at timestamptz not null default now();

create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_images_sort_order_idx on public.product_images(product_id, sort_order);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid null references auth.users(id) on delete set null,
  session_id text null,
  product_id uuid null references public.products(id) on delete set null,
  order_id uuid null references public.orders(id) on delete set null,
  quantity integer null default 1,
  amount numeric null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists event_type text;
alter table public.analytics_events add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.analytics_events add column if not exists session_id text;
alter table public.analytics_events add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.analytics_events add column if not exists order_id uuid references public.orders(id) on delete set null;
alter table public.analytics_events add column if not exists quantity integer default 1;
alter table public.analytics_events add column if not exists amount numeric default 0;
alter table public.analytics_events add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.analytics_events add column if not exists created_at timestamptz not null default now();

create index if not exists analytics_events_event_type_idx on public.analytics_events(event_type);
create index if not exists analytics_events_product_id_idx on public.analytics_events(product_id);
create index if not exists analytics_events_user_id_idx on public.analytics_events(user_id);
create index if not exists analytics_events_session_id_idx on public.analytics_events(session_id);
create index if not exists analytics_events_created_at_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_event_product_idx on public.analytics_events(event_type, product_id);
create index if not exists analytics_events_event_user_idx on public.analytics_events(event_type, user_id);

create or replace function public.track_analytics_event(
  p_event_type text,
  p_product_id uuid default null,
  p_order_id uuid default null,
  p_quantity int default 1,
  p_amount numeric default 0,
  p_metadata jsonb default '{}'::jsonb,
  p_session_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_user_id uuid := auth.uid();
begin
  if p_event_type not in (
    'product_view',
    'add_to_cart',
    'add_to_favorite',
    'remove_from_favorite',
    'checkout_started',
    'order_created',
    'payment_confirmed'
  ) then
    raise exception 'ANALYTICS_EVENT_NOT_ALLOWED';
  end if;

  insert into public.analytics_events (
    event_type,
    user_id,
    session_id,
    product_id,
    order_id,
    quantity,
    amount,
    metadata
  )
  values (
    p_event_type,
    v_user_id,
    nullif(p_session_id, ''),
    p_product_id,
    p_order_id,
    greatest(coalesce(p_quantity, 1), 1),
    coalesce(p_amount, 0),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.create_order_with_stock(
  p_order jsonb,
  p_items jsonb,
  p_payment jsonb default '{}'::jsonb
)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_user_id uuid;
  v_order_number text;
  v_item jsonb;
  v_validated_items jsonb := '[]'::jsonb;
  v_product_id uuid;
  v_quantity int;
  v_available_stock int;
  v_product_price numeric;
  v_item_total numeric;
  v_calculated_subtotal numeric := 0;
  v_subtotal numeric;
  v_shipping numeric;
  v_shipping_total numeric;
  v_payment_method text;
  v_payment_fee numeric;
  v_total_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  v_order_id := nullif(p_order->>'id', '')::uuid;
  v_user_id := nullif(p_order->>'user_id', '')::uuid;
  v_order_number := nullif(p_order->>'order_number', '');

  if v_order_id is null or v_user_id is null or v_order_number is null then
    raise exception 'ORDER_PAYLOAD_INVALID';
  end if;

  if v_user_id <> auth.uid() then
    raise exception 'ORDER_USER_MISMATCH';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item->>'product_id', '')::uuid;
    v_quantity := coalesce((v_item->>'quantity')::int, 0);

    if v_product_id is null then
      raise exception 'STOCK_PRODUCT_REQUIRED'
        using detail = jsonb_build_object(
          'product_name', coalesce(v_item->>'product_name', 'Producto'),
          'quantity', v_quantity
        )::text;
    end if;

    if v_quantity <= 0 then
      raise exception 'STOCK_QUANTITY_INVALID'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'quantity', v_quantity
        )::text;
    end if;

    select coalesce(products.stock, 0), coalesce(products.price, 0)
    into v_available_stock, v_product_price
    from public.products
    where products.id = v_product_id
      and products.is_active = true
    for update;

    if not found then
      raise exception 'STOCK_PRODUCT_NOT_FOUND'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'quantity', v_quantity
        )::text;
    end if;

    if v_available_stock < v_quantity then
      raise exception 'STOCK_INSUFFICIENT'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'product_name', coalesce(v_item->>'product_name', 'Producto'),
          'requested', v_quantity,
          'available', v_available_stock
        )::text;
    end if;

    v_item_total := v_product_price * v_quantity;
    v_calculated_subtotal := v_calculated_subtotal + v_item_total;
    v_validated_items := v_validated_items || jsonb_build_array(
      v_item || jsonb_build_object(
        'unit_price', v_product_price,
        'subtotal', v_item_total,
        'total_price', v_item_total
      )
    );
  end loop;

  v_subtotal := v_calculated_subtotal;
  v_shipping := coalesce(nullif(p_order->>'shipping', '')::numeric, 0);
  v_shipping_total := coalesce(nullif(p_order->>'shipping_total', '')::numeric, v_shipping, 0);
  v_payment_method := lower(coalesce(p_order->>'payment_method', ''));
  v_payment_fee := case
    when v_payment_method = 'mercadopago' then round((v_subtotal + v_shipping_total) * 0.10, 0)
    else 0
  end;
  v_total_amount := v_subtotal + v_shipping_total + v_payment_fee;

  insert into public.orders (
    id,
    user_id,
    order_number,
    subtotal,
    shipping,
    shipping_total,
    payment_fee,
    total_amount,
    total,
    status,
    payment_method,
    payment_status,
    delivery_method,
    shipping_method,
    shipping_address,
    billing_address,
    city,
    province,
    postal_code,
    shipping_zone_id,
    shipping_zone_name,
    shipping_requires_quote,
    customer_name,
    customer_email,
    customer_phone,
    notes,
    stock_deducted,
    stock_deducted_at
  )
  values (
    v_order_id,
    v_user_id,
    v_order_number,
    v_subtotal,
    v_shipping,
    v_shipping_total,
    v_payment_fee,
    v_total_amount,
    v_total_amount,
    coalesce(p_order->>'status', 'pending'),
    p_order->>'payment_method',
    coalesce(p_order->>'payment_status', 'pending'),
    p_order->>'delivery_method',
    p_order->>'shipping_method',
    p_order->>'shipping_address',
    p_order->>'billing_address',
    p_order->>'city',
    p_order->>'province',
    p_order->>'postal_code',
    nullif(p_order->>'shipping_zone_id', '')::uuid,
    p_order->>'shipping_zone_name',
    coalesce((p_order->>'shipping_requires_quote')::boolean, false),
    p_order->>'customer_name',
    p_order->>'customer_email',
    p_order->>'customer_phone',
    p_order->>'notes',
    false,
    null
  );

  for v_item in select value from jsonb_array_elements(v_validated_items)
  loop
    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      subtotal,
      total_price,
      product_details
    )
    values (
      v_order_id,
      nullif(v_item->>'product_id', '')::uuid,
      v_item->>'product_name',
      v_item->>'product_image',
      coalesce((v_item->>'quantity')::int, 1),
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce(
        nullif(v_item->>'subtotal', '')::numeric,
        nullif(v_item->>'total_price', '')::numeric,
        coalesce((v_item->>'quantity')::int, 1) * coalesce((v_item->>'unit_price')::numeric, 0),
        0
      ),
      coalesce(
        nullif(v_item->>'total_price', '')::numeric,
        nullif(v_item->>'subtotal', '')::numeric,
        coalesce((v_item->>'quantity')::int, 1) * coalesce((v_item->>'unit_price')::numeric, 0),
        0
      ),
      coalesce(v_item->'product_details', '{}'::jsonb)
    );
  end loop;

  if p_payment is not null and p_payment <> '{}'::jsonb then
    insert into public.payments (
      order_id,
      amount,
      method,
      status,
      payment_status,
      preference_id,
      provider_payment_id
    )
    values (
      v_order_id,
      v_total_amount,
      coalesce(nullif(p_payment->>'method', ''), v_payment_method),
      coalesce(p_payment->>'status', 'pending'),
      coalesce(p_payment->>'payment_status', 'pending'),
      p_payment->>'preference_id',
      p_payment->>'provider_payment_id'
    );
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

create or replace function public.confirm_order_payment_and_deduct_stock(
  p_order_id uuid,
  p_payment_status text,
  p_order_status text
)
returns table (id uuid, order_number text, stock_deducted boolean, status text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_available_stock int;
  v_rows int;
  v_item_count int := 0;
  v_auth_role text := coalesce(auth.role(), '');
  v_payment_status text := coalesce(nullif(p_payment_status, ''), 'confirmed');
  v_order_status text := coalesce(nullif(p_order_status, ''), 'confirmed');
begin
  if p_order_id is null then
    raise exception 'ORDER_ID_REQUIRED';
  end if;

  if auth.uid() is null and v_auth_role <> 'service_role' then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_auth_role <> 'service_role' and not public.is_admin(auth.uid()) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select *
  into v_order
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if lower(coalesce(v_order.status, '')) = 'cancelled'
    or lower(coalesce(v_order.payment_status, '')) = 'cancelled' then
    raise exception 'ORDER_ALREADY_CANCELLED';
  end if;

  if coalesce(v_order.stock_deducted, false) then
    update public.orders
    set
      status = v_order_status,
      payment_status = v_payment_status,
      updated_at = now()
    where orders.id = p_order_id;

    update public.payments
    set
      status = v_payment_status,
      payment_status = v_payment_status
    where payments.order_id = p_order_id;

    return query
      select p_order_id, v_order.order_number, true, v_order_status, v_payment_status;
    return;
  end if;

  for v_item in
    select
      order_items.product_id,
      max(order_items.product_name) as product_name,
      sum(coalesce(order_items.quantity, 0))::int as quantity
    from public.order_items
    where order_items.order_id = p_order_id
    group by order_items.product_id
  loop
    v_item_count := v_item_count + 1;

    if v_item.product_id is null then
      raise exception 'STOCK_PRODUCT_REQUIRED'
        using detail = jsonb_build_object(
          'order_id', p_order_id,
          'product_name', coalesce(v_item.product_name, 'Producto'),
          'quantity', v_item.quantity
        )::text;
    end if;

    if v_item.quantity <= 0 then
      raise exception 'STOCK_QUANTITY_INVALID'
        using detail = jsonb_build_object(
          'order_id', p_order_id,
          'product_id', v_item.product_id,
          'quantity', v_item.quantity
        )::text;
    end if;

    select coalesce(products.stock, 0)
    into v_available_stock
    from public.products
    where products.id = v_item.product_id
      and products.is_active = true
    for update;

    if not found then
      update public.orders
      set
        status = 'requires_review',
        payment_status = v_payment_status,
        updated_at = now()
      where orders.id = p_order_id;

      update public.payments
      set
        status = v_payment_status,
        payment_status = v_payment_status
      where payments.order_id = p_order_id;

      return query
        select p_order_id, v_order.order_number, false, 'requires_review'::text, v_payment_status;
      return;
    end if;

    if v_available_stock < v_item.quantity then
      update public.orders
      set
        status = 'requires_review',
        payment_status = v_payment_status,
        updated_at = now()
      where orders.id = p_order_id;

      update public.payments
      set
        status = v_payment_status,
        payment_status = v_payment_status
      where payments.order_id = p_order_id;

      return query
        select p_order_id, v_order.order_number, false, 'requires_review'::text, v_payment_status;
      return;
    end if;

  end loop;

  if v_item_count = 0 then
    raise exception 'ORDER_ITEMS_REQUIRED';
  end if;

  for v_item in
    select
      order_items.product_id,
      sum(coalesce(order_items.quantity, 0))::int as quantity
    from public.order_items
    where order_items.order_id = p_order_id
    group by order_items.product_id
  loop
    update public.products
    set stock = coalesce(stock, 0) - v_item.quantity
    where products.id = v_item.product_id;
    get diagnostics v_rows = row_count;

    if v_rows <> 1 then
      raise exception 'STOCK_DEDUCT_FAILED'
        using detail = jsonb_build_object(
          'order_id', p_order_id,
          'product_id', v_item.product_id,
          'quantity', v_item.quantity
        )::text;
    end if;
  end loop;

  update public.orders
  set
    status = v_order_status,
    payment_status = v_payment_status,
    stock_deducted = true,
    stock_deducted_at = now(),
    updated_at = now()
  where orders.id = p_order_id;

  update public.payments
  set
    status = v_payment_status,
    payment_status = v_payment_status
  where payments.order_id = p_order_id;

  return query
    select p_order_id, v_order.order_number, true, v_order_status, v_payment_status;
end;
$$;

create or replace function public.cancel_pending_order(
  p_order_id uuid
)
returns table (id uuid, status text, payment_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_auth_uid uuid := auth.uid();
  v_auth_role text := coalesce(auth.role(), '');
  v_order_status text;
  v_payment_status text;
begin
  if p_order_id is null then
    raise exception 'ORDER_ID_REQUIRED';
  end if;

  if v_auth_uid is null and v_auth_role <> 'service_role' then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_order
  from public.orders
  where orders.id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_auth_role <> 'service_role'
    and not public.is_admin(v_auth_uid)
    and v_order.user_id <> v_auth_uid then
    raise exception 'ORDER_FORBIDDEN';
  end if;

  v_order_status := lower(coalesce(v_order.status, ''));
  v_payment_status := lower(coalesce(v_order.payment_status, ''));

  if coalesce(v_order.stock_deducted, false) then
    raise exception 'ORDER_ALREADY_DEDUCTED';
  end if;

  if v_order_status = 'cancelled' or v_payment_status = 'cancelled' then
    update public.orders
    set
      status = 'cancelled',
      payment_status = 'cancelled',
      updated_at = now()
    where orders.id = p_order_id;

    update public.payments
    set
      status = 'cancelled',
      payment_status = 'cancelled'
    where payments.order_id = p_order_id;

    return query select p_order_id, 'cancelled'::text, 'cancelled'::text;
    return;
  end if;

  if v_order_status in ('confirmed', 'paid', 'approved', 'processing', 'completed', 'delivered')
    or v_payment_status in ('confirmed', 'paid', 'approved', 'processing', 'completed', 'delivered') then
    raise exception 'ORDER_ALREADY_CONFIRMED';
  end if;

  if v_order_status not in ('pending', 'pending_cash_payment', 'awaiting_transfer', 'awaiting_payment', 'payment_pending', 'received')
    and v_payment_status not in ('pending', 'pending_cash_payment', 'awaiting_transfer', 'awaiting_payment', 'payment_pending', 'received') then
    raise exception 'ORDER_NOT_CANCELABLE';
  end if;

  update public.orders
  set
    status = 'cancelled',
    payment_status = 'cancelled',
    updated_at = now()
  where orders.id = p_order_id;

  update public.payments
  set
    status = 'cancelled',
    payment_status = 'cancelled'
  where payments.order_id = p_order_id;

  return query select p_order_id, 'cancelled'::text, 'cancelled'::text;
end;
$$;

alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.product_images enable row level security;
alter table public.analytics_events enable row level security;

drop policy if exists "Active products are public" on public.products;
create policy "Active products are public"
on public.products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can read all products" on public.products;
create policy "Admins can read all products"
on public.products
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can insert products" on public.products;
create policy "Admins can insert products"
on public.products
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
on public.products
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can delete products" on public.products;
create policy "Admins can delete products"
on public.products
for delete
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Active product images are public" on public.product_images;
create policy "Active product images are public"
on public.product_images
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.products
    where products.id = product_images.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins manage product images" on public.product_images;
create policy "Admins manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert own customer profile" on public.profiles;
create policy "Users can insert own customer profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id and role = 'customer');

drop policy if exists "Users can update own profile fields" on public.profiles;
create policy "Users can update own profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders"
on public.orders
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
on public.orders
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own orders" on public.orders;
create policy "Users can read own orders"
on public.orders
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Admins can update order status" on public.orders;
create policy "Admins can update order status"
on public.orders
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can read all order items" on public.order_items;
create policy "Admins can read all order items"
on public.order_items
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Users can create own order items" on public.order_items;
create policy "Users can create own order items"
on public.order_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can read own order items" on public.order_items;
create policy "Users can read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read all payments" on public.payments;
create policy "Admins can read all payments"
on public.payments
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Users can create own payments" on public.payments;
create policy "Users can create own payments"
on public.payments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where orders.id = payments.order_id
      and orders.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can read all customer addresses" on public.customer_addresses;
create policy "Admins can read all customer addresses"
on public.customer_addresses
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Active shipping zones are public" on public.shipping_zones;
create policy "Active shipping zones are public"
on public.shipping_zones
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins manage shipping zones" on public.shipping_zones;
create policy "Admins manage shipping zones"
on public.shipping_zones
for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can read analytics events" on public.analytics_events;
create policy "Admins can read analytics events"
on public.analytics_events
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Anyone can insert allowed analytics events" on public.analytics_events;
create policy "Anyone can insert allowed analytics events"
on public.analytics_events
for insert
to anon, authenticated
with check (
  event_type in (
    'product_view',
    'add_to_cart',
    'add_to_favorite',
    'remove_from_favorite',
    'checkout_started',
    'order_created',
    'payment_confirmed'
  )
  and (user_id is null or user_id = (select auth.uid()))
);

grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select on public.product_images to anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant select, insert on public.profiles to authenticated;
grant update (full_name, phone, address) on public.profiles to authenticated;
grant select, insert, update on public.orders to authenticated;
grant select, insert on public.order_items to authenticated;
grant select, insert on public.payments to authenticated;
grant select on public.customer_addresses to authenticated;
grant select on public.shipping_zones to anon, authenticated;
grant insert, update, delete on public.shipping_zones to authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
revoke all on function public.create_order_with_stock(jsonb, jsonb, jsonb) from public;
grant execute on function public.create_order_with_stock(jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.confirm_order_payment_and_deduct_stock(uuid, text, text) from public;
grant execute on function public.confirm_order_payment_and_deduct_stock(uuid, text, text) to authenticated, service_role;
revoke all on function public.cancel_pending_order(uuid) from public;
grant execute on function public.cancel_pending_order(uuid) to authenticated, service_role;
revoke all on function public.track_analytics_event(text, uuid, uuid, int, numeric, jsonb, text) from public;
grant execute on function public.track_analytics_event(text, uuid, uuid, int, numeric, jsonb, text) to anon, authenticated;

notify pgrst, 'reload schema';

-- Your admin user is already present. If you ever need to mark another user:
-- update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
