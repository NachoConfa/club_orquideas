-- Etapas 2 y 3: cupones de descuento y beneficios de carnet para Modo Plantas.
-- Revisar y ejecutar manualmente en Supabase SQL Editor.
-- No modifica confirm_order_payment_and_deduct_stock ni cancel_pending_order.
-- Para la Etapa 3, ejecutar primero database/loyalty-benefits.sql.

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  description text,
  discount_type text not null,
  discount_value numeric not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  min_order_amount numeric not null default 0,
  max_uses integer,
  max_uses_per_user integer,
  requires_login boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_discount_type_check
    check (discount_type in ('percent', 'fixed_amount', 'free_shipping')),
  constraint coupons_discount_value_check check (discount_value >= 0),
  constraint coupons_min_order_amount_check check (min_order_amount >= 0),
  constraint coupons_max_uses_check check (max_uses is null or max_uses > 0),
  constraint coupons_max_uses_per_user_check
    check (max_uses_per_user is null or max_uses_per_user > 0),
  constraint coupons_date_range_check
    check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create unique index if not exists coupons_normalized_code_key
on public.coupons (upper(btrim(code)));

create index if not exists coupons_active_dates_idx
on public.coupons (is_active, starts_at, ends_at);

alter table public.loyalty_benefits
add column if not exists coupon_id uuid;

do $$
declare
  v_constraint record;
begin
  if not exists (
    select 1
    from pg_constraint constraint_info
    join pg_attribute attribute_info
      on attribute_info.attrelid = constraint_info.conrelid
      and attribute_info.attnum = any(constraint_info.conkey)
    where constraint_info.conrelid = 'public.loyalty_benefits'::regclass
      and constraint_info.contype = 'f'
      and attribute_info.attname = 'coupon_id'
  ) then
    alter table public.loyalty_benefits
    add constraint loyalty_benefits_coupon_id_fkey
    foreign key (coupon_id) references public.coupons(id) on delete set null;
  end if;

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.loyalty_benefits'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%benefit_type%'
  loop
    execute format(
      'alter table public.loyalty_benefits drop constraint %I',
      v_constraint.conname
    );
  end loop;

  alter table public.loyalty_benefits
  add constraint loyalty_benefits_benefit_type_check
  check (benefit_type in ('gift', 'manual', 'coupon'));
end;
$$;

create index if not exists loyalty_benefits_coupon_id_idx
on public.loyalty_benefits(coupon_id);

alter table public.orders
add column if not exists coupon_id uuid references public.coupons(id) on delete set null;

alter table public.orders
add column if not exists coupon_code text;

alter table public.orders
add column if not exists discount_total numeric not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_discount_total_check'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_discount_total_check check (discount_total >= 0);
  end if;
end;
$$;

create index if not exists orders_coupon_id_idx on public.orders(coupon_id);
create index if not exists orders_coupon_code_idx on public.orders(coupon_code);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  code text not null,
  discount_amount numeric not null default 0,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  constraint coupon_redemptions_discount_amount_check check (discount_amount >= 0),
  constraint coupon_redemptions_status_check
    check (status in ('reserved', 'redeemed', 'released')),
  constraint coupon_redemptions_coupon_order_key unique (coupon_id, order_id)
);

create index if not exists coupon_redemptions_coupon_status_idx
on public.coupon_redemptions(coupon_id, status);

create index if not exists coupon_redemptions_user_coupon_status_idx
on public.coupon_redemptions(user_id, coupon_id, status);

create index if not exists coupon_redemptions_order_id_idx
on public.coupon_redemptions(order_id);

create or replace function public.get_my_loyalty_benefits()
returns table (
  id uuid,
  title text,
  description text,
  required_purchases integer,
  benefit_type text,
  coupon_id uuid,
  coupon_code text,
  coupon_description text,
  coupon_is_active boolean,
  is_unlocked boolean,
  gift_description text,
  is_active boolean,
  sort_order integer,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_valid_purchases integer := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select count(*)::integer
  into v_valid_purchases
  from public.orders
  where orders.user_id = v_user_id
    and orders.stock_deducted = true
    and lower(coalesce(orders.status, '')) not in ('cancelled', 'cancelado');

  return query
  select
    loyalty_benefits.id,
    loyalty_benefits.title,
    loyalty_benefits.description,
    loyalty_benefits.required_purchases,
    loyalty_benefits.benefit_type,
    loyalty_benefits.coupon_id,
    case
      when v_valid_purchases >= loyalty_benefits.required_purchases
        and loyalty_benefits.benefit_type = 'coupon'
      then coupons.code
      else null
    end as coupon_code,
    case
      when v_valid_purchases >= loyalty_benefits.required_purchases
        and loyalty_benefits.benefit_type = 'coupon'
      then coupons.description
      else null
    end as coupon_description,
    case
      when loyalty_benefits.benefit_type = 'coupon'
      then coupons.is_active
      else null
    end as coupon_is_active,
    v_valid_purchases >= loyalty_benefits.required_purchases as is_unlocked,
    loyalty_benefits.gift_description,
    loyalty_benefits.is_active,
    loyalty_benefits.sort_order,
    loyalty_benefits.created_at,
    loyalty_benefits.updated_at
  from public.loyalty_benefits
  left join public.coupons on coupons.id = loyalty_benefits.coupon_id
  where loyalty_benefits.is_active = true
  order by
    loyalty_benefits.required_purchases,
    loyalty_benefits.sort_order,
    loyalty_benefits.created_at;
end;
$$;

create or replace function public.validate_coupon_for_checkout(
  p_code text,
  p_subtotal numeric,
  p_shipping numeric default 0
)
returns table (
  valid boolean,
  coupon_id uuid,
  code text,
  discount_type text,
  discount_value numeric,
  discount_amount numeric,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_subtotal numeric := greatest(coalesce(p_subtotal, 0), 0);
  v_shipping numeric := greatest(coalesce(p_shipping, 0), 0);
  v_user_id uuid := auth.uid();
  v_global_uses integer := 0;
  v_user_uses integer := 0;
  v_loyalty_required_purchases integer;
  v_valid_purchases integer := 0;
  v_discount numeric := 0;
begin
  if v_code = '' then
    return query
    select false, null::uuid, null::text, null::text, 0::numeric, 0::numeric,
      'Ingresá un código de cupón.'::text;
    return;
  end if;

  if v_subtotal <= 0 then
    return query
    select false, null::uuid, v_code, null::text, 0::numeric, 0::numeric,
      'El carrito no tiene productos comprables.'::text;
    return;
  end if;

  select coupons.*
  into v_coupon
  from public.coupons
  where upper(btrim(coupons.code)) = v_code;

  if not found then
    return query
    select false, null::uuid, v_code, null::text, 0::numeric, 0::numeric,
      'El cupón ingresado no existe.'::text;
    return;
  end if;

  if not v_coupon.is_active then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      'Este cupón no está activo.'::text;
    return;
  end if;

  if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      'Este cupón todavía no está disponible.'::text;
    return;
  end if;

  if v_coupon.ends_at is not null and now() >= v_coupon.ends_at then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      'Este cupón está vencido.'::text;
    return;
  end if;

  if v_coupon.requires_login and v_user_id is null then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      'Iniciá sesión para usar este cupón.'::text;
    return;
  end if;

  if v_subtotal < v_coupon.min_order_amount then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      format('Este cupón requiere una compra mínima de $%s.', trim(to_char(v_coupon.min_order_amount, 'FM999G999G999G990')))::text;
    return;
  end if;

  select min(loyalty_benefits.required_purchases)
  into v_loyalty_required_purchases
  from public.loyalty_benefits
  where loyalty_benefits.coupon_id = v_coupon.id
    and loyalty_benefits.is_active = true
    and loyalty_benefits.benefit_type = 'coupon';

  if v_loyalty_required_purchases is not null then
    if v_user_id is null then
      return query
      select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
        'Iniciá sesión para usar este cupón del carnet.'::text;
      return;
    end if;

    select count(*)::integer
    into v_valid_purchases
    from public.orders
    where orders.user_id = v_user_id
      and orders.stock_deducted = true
      and lower(coalesce(orders.status, '')) not in ('cancelled', 'cancelado');

    if v_valid_purchases < v_loyalty_required_purchases then
      return query
      select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
        'Este cupón todavía no está desbloqueado en tu carnet.'::text;
      return;
    end if;
  end if;

  select count(*)::integer
  into v_global_uses
  from public.coupon_redemptions
  where coupon_redemptions.coupon_id = v_coupon.id
    and coupon_redemptions.status in ('reserved', 'redeemed');

  if v_coupon.max_uses is not null and v_global_uses >= v_coupon.max_uses then
    return query
    select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
      'Este cupón alcanzó su límite de usos.'::text;
    return;
  end if;

  if v_coupon.max_uses_per_user is not null then
    if v_user_id is null then
      return query
      select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
        'Iniciá sesión para validar el límite de uso de este cupón.'::text;
      return;
    end if;

    select count(*)::integer
    into v_user_uses
    from public.coupon_redemptions
    where coupon_redemptions.coupon_id = v_coupon.id
      and coupon_redemptions.user_id = v_user_id
      and coupon_redemptions.status in ('reserved', 'redeemed');

    if v_user_uses >= v_coupon.max_uses_per_user then
      return query
      select false, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value, 0::numeric,
        'Ya usaste este cupón la cantidad máxima permitida.'::text;
      return;
    end if;
  end if;

  v_discount := case v_coupon.discount_type
    when 'percent' then least(v_subtotal, round(v_subtotal * v_coupon.discount_value / 100, 0))
    when 'fixed_amount' then least(v_subtotal, v_coupon.discount_value)
    when 'free_shipping' then v_shipping
    else 0
  end;

  return query
  select true, v_coupon.id, v_code, v_coupon.discount_type, v_coupon.discount_value,
    greatest(v_discount, 0),
    'Cupón aplicado correctamente.'::text;
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
  v_variant_id uuid;
  v_quantity int;
  v_available_stock int;
  v_product_price numeric;
  v_product_image text;
  v_variant_color text;
  v_variant_size text;
  v_variant_flowering_stems integer;
  v_variant_image_url text;
  v_price_mode text;
  v_stock_mode text;
  v_product_details jsonb;
  v_item_total numeric;
  v_calculated_subtotal numeric := 0;
  v_subtotal numeric;
  v_shipping numeric;
  v_shipping_total numeric;
  v_payment_method text;
  v_payment_provider text;
  v_payment_method_value text;
  v_payment_fee numeric;
  v_total_amount numeric;
  v_coupon_code text;
  v_coupon public.coupons%rowtype;
  v_coupon_id uuid;
  v_discount_total numeric := 0;
  v_global_uses integer := 0;
  v_user_uses integer := 0;
  v_loyalty_required_purchases integer;
  v_valid_purchases integer := 0;
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
    v_variant_id := coalesce(
      nullif(v_item->>'variant_id', '')::uuid,
      nullif(v_item #>> '{product_details,variant_id}', '')::uuid
    );
    v_quantity := coalesce(nullif(v_item->>'quantity', '')::int, 0);
    v_product_details := case
      when jsonb_typeof(v_item->'product_details') = 'object' then v_item->'product_details'
      else '{}'::jsonb
    end;

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

    if v_variant_id is not null then
      select
        coalesce(product_variants.stock, 0),
        coalesce(product_variants.price, 0),
        product_variants.color,
        product_variants.size,
        product_variants.flowering_stems,
        product_variants.image_url,
        coalesce(product_variants.price_mode, 'fixed'),
        coalesce(product_variants.stock_mode, 'quantity'),
        products.image_url
      into
        v_available_stock,
        v_product_price,
        v_variant_color,
        v_variant_size,
        v_variant_flowering_stems,
        v_variant_image_url,
        v_price_mode,
        v_stock_mode,
        v_product_image
      from public.product_variants
      join public.products on products.id = product_variants.product_id
      where product_variants.id = v_variant_id
        and product_variants.product_id = v_product_id
        and coalesce(product_variants.is_active, true) = true
        and coalesce(products.is_active, true) = true
      for update of product_variants;
    else
      select
        coalesce(products.stock, 0),
        coalesce(products.price, 0),
        products.image_url,
        coalesce(products.price_mode, 'fixed'),
        coalesce(products.stock_mode, 'quantity')
      into
        v_available_stock,
        v_product_price,
        v_product_image,
        v_price_mode,
        v_stock_mode
      from public.products
      where products.id = v_product_id
        and coalesce(products.is_active, true) = true
      for update of products;

      v_variant_color := v_item->>'color';
      v_variant_size := v_item->>'size';
      v_variant_flowering_stems := nullif(v_item->>'flowering_stems', '')::integer;
      v_variant_image_url := null;
    end if;

    if not found then
      raise exception 'STOCK_PRODUCT_NOT_FOUND'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'variant_id', v_variant_id,
          'quantity', v_quantity
        )::text;
    end if;

    if v_price_mode = 'quote' then
      raise exception 'PRODUCT_REQUIRES_QUOTE'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'variant_id', v_variant_id,
          'product_name', coalesce(v_item->>'product_name', 'Producto')
        )::text;
    end if;

    if v_stock_mode = 'consult' then
      raise exception 'PRODUCT_REQUIRES_CONSULTATION'
        using detail = jsonb_build_object(
          'product_id', v_product_id,
          'variant_id', v_variant_id,
          'product_name', coalesce(v_item->>'product_name', 'Producto')
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
    v_product_image := case
      when v_variant_id is not null then coalesce(
        nullif(v_variant_image_url, ''),
        nullif(v_product_image, ''),
        nullif(v_item->>'product_image', ''),
        nullif(v_item->>'image_url', '')
      )
      else coalesce(
        nullif(v_product_image, ''),
        nullif(v_item->>'product_image', ''),
        nullif(v_item->>'image_url', '')
      )
    end;
    v_product_details := v_product_details || jsonb_build_object(
      'variant_id', v_variant_id,
      'color', coalesce(v_variant_color, v_product_details->>'color'),
      'size', coalesce(v_variant_size, v_product_details->>'size'),
      'flowering_stems', coalesce(to_jsonb(v_variant_flowering_stems), v_product_details->'flowering_stems'),
      'image_url', coalesce(v_product_image, v_product_details->>'image_url')
    );

    v_validated_items := v_validated_items || jsonb_build_array(
      v_item || jsonb_build_object(
        'variant_id', v_variant_id,
        'product_image', v_product_image,
        'unit_price', v_product_price,
        'subtotal', v_item_total,
        'total_price', v_item_total,
        'product_details', v_product_details
      )
    );
  end loop;

  v_subtotal := v_calculated_subtotal;
  v_shipping := greatest(coalesce(nullif(p_order->>'shipping', '')::numeric, 0), 0);
  v_shipping_total := greatest(
    coalesce(nullif(p_order->>'shipping_total', '')::numeric, v_shipping, 0),
    0
  );
  v_payment_method := lower(coalesce(p_order->>'payment_method', ''));
  v_coupon_code := upper(btrim(coalesce(p_order->>'coupon_code', '')));

  if v_coupon_code <> '' then
    select coupons.*
    into v_coupon
    from public.coupons
    where upper(btrim(coupons.code)) = v_coupon_code
    for update;

    if not found then
      raise exception 'COUPON_NOT_FOUND';
    end if;

    if not v_coupon.is_active then
      raise exception 'COUPON_INACTIVE';
    end if;

    if v_coupon.starts_at is not null and now() < v_coupon.starts_at then
      raise exception 'COUPON_NOT_STARTED';
    end if;

    if v_coupon.ends_at is not null and now() >= v_coupon.ends_at then
      raise exception 'COUPON_EXPIRED';
    end if;

    if v_coupon.requires_login and auth.uid() is null then
      raise exception 'COUPON_LOGIN_REQUIRED';
    end if;

    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'COUPON_MIN_ORDER'
        using detail = v_coupon.min_order_amount::text;
    end if;

    select min(loyalty_benefits.required_purchases)
    into v_loyalty_required_purchases
    from public.loyalty_benefits
    where loyalty_benefits.coupon_id = v_coupon.id
      and loyalty_benefits.is_active = true
      and loyalty_benefits.benefit_type = 'coupon';

    if v_loyalty_required_purchases is not null then
      select count(*)::integer
      into v_valid_purchases
      from public.orders
      where orders.user_id = v_user_id
        and orders.stock_deducted = true
        and lower(coalesce(orders.status, '')) not in ('cancelled', 'cancelado');

      if v_valid_purchases < v_loyalty_required_purchases then
        raise exception 'COUPON_LOYALTY_LOCKED';
      end if;
    end if;

    select count(*)::integer
    into v_global_uses
    from public.coupon_redemptions
    where coupon_redemptions.coupon_id = v_coupon.id
      and coupon_redemptions.status in ('reserved', 'redeemed');

    if v_coupon.max_uses is not null and v_global_uses >= v_coupon.max_uses then
      raise exception 'COUPON_MAX_USES';
    end if;

    if v_coupon.max_uses_per_user is not null then
      select count(*)::integer
      into v_user_uses
      from public.coupon_redemptions
      where coupon_redemptions.coupon_id = v_coupon.id
        and coupon_redemptions.user_id = v_user_id
        and coupon_redemptions.status in ('reserved', 'redeemed');

      if v_user_uses >= v_coupon.max_uses_per_user then
        raise exception 'COUPON_USER_MAX_USES';
      end if;
    end if;

    v_coupon_id := v_coupon.id;
    v_discount_total := case v_coupon.discount_type
      when 'percent' then least(v_subtotal, round(v_subtotal * v_coupon.discount_value / 100, 0))
      when 'fixed_amount' then least(v_subtotal, v_coupon.discount_value)
      when 'free_shipping' then v_shipping_total
      else 0
    end;
  end if;

  v_discount_total := greatest(coalesce(v_discount_total, 0), 0);
  v_payment_fee := case
    when v_payment_method = 'mercadopago' then
      round(greatest(v_subtotal + v_shipping_total - v_discount_total, 0) * 0.10, 0)
    else 0
  end;
  v_total_amount := greatest(v_subtotal + v_shipping_total - v_discount_total, 0) + v_payment_fee;

  insert into public.orders (
    id,
    user_id,
    order_number,
    subtotal,
    shipping,
    shipping_total,
    coupon_id,
    coupon_code,
    discount_total,
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
    v_coupon_id,
    nullif(v_coupon_code, ''),
    v_discount_total,
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
      variant_id,
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
      nullif(v_item->>'variant_id', '')::uuid,
      v_item->>'product_name',
      v_item->>'product_image',
      coalesce(nullif(v_item->>'quantity', '')::int, 1),
      coalesce(nullif(v_item->>'unit_price', '')::numeric, 0),
      coalesce(nullif(v_item->>'subtotal', '')::numeric, 0),
      coalesce(nullif(v_item->>'total_price', '')::numeric, 0),
      coalesce(v_item->'product_details', '{}'::jsonb)
    );
  end loop;

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (
      coupon_id,
      user_id,
      order_id,
      code,
      discount_amount,
      status
    )
    values (
      v_coupon_id,
      v_user_id,
      v_order_id,
      v_coupon_code,
      v_discount_total,
      'reserved'
    );
  end if;

  if p_payment is not null and p_payment <> '{}'::jsonb then
    v_payment_provider := coalesce(
      nullif(p_payment->>'provider', ''),
      nullif(p_payment->>'method', ''),
      nullif(v_payment_method, ''),
      'manual'
    );
    v_payment_method_value := coalesce(
      nullif(p_payment->>'payment_method', ''),
      nullif(p_payment->>'method', ''),
      nullif(v_payment_method, '')
    );

    insert into public.payments (
      order_id,
      amount,
      provider,
      payment_method,
      method,
      status,
      payment_status,
      preference_id,
      provider_payment_id
    )
    values (
      v_order_id,
      v_total_amount,
      v_payment_provider,
      v_payment_method_value,
      coalesce(nullif(p_payment->>'method', ''), v_payment_method_value),
      coalesce(p_payment->>'status', 'pending'),
      coalesce(p_payment->>'payment_status', 'pending'),
      p_payment->>'preference_id',
      p_payment->>'provider_payment_id'
    );
  end if;

  return query select v_order_id, v_order_number;
end;
$$;

create or replace function public.sync_coupon_redemption_from_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.coupon_id is null then
    return new;
  end if;

  if new.stock_deducted = true and coalesce(old.stock_deducted, false) = false then
    update public.coupon_redemptions
    set
      status = 'redeemed',
      redeemed_at = coalesce(redeemed_at, now())
    where order_id = new.id
      and status = 'reserved';
  elsif lower(coalesce(new.status, '')) in ('cancelled', 'cancelado')
     or lower(coalesce(new.payment_status, '')) in ('cancelled', 'cancelado') then
    update public.coupon_redemptions
    set
      status = 'released',
      redeemed_at = null
    where order_id = new.id
      and status = 'reserved';
  end if;

  return new;
end;
$$;

drop trigger if exists sync_coupon_redemption_from_order_trigger on public.orders;
create trigger sync_coupon_redemption_from_order_trigger
after update of stock_deducted, status, payment_status on public.orders
for each row execute function public.sync_coupon_redemption_from_order();

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "Admins can read coupons" on public.coupons;
create policy "Admins can read coupons"
on public.coupons
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can insert coupons" on public.coupons;
create policy "Admins can insert coupons"
on public.coupons
for insert
to authenticated
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can update coupons" on public.coupons;
create policy "Admins can update coupons"
on public.coupons
for update
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

drop policy if exists "Admins can delete coupons" on public.coupons;
create policy "Admins can delete coupons"
on public.coupons
for delete
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Admins can read coupon redemptions" on public.coupon_redemptions;
create policy "Admins can read coupon redemptions"
on public.coupon_redemptions
for select
to authenticated
using (public.is_admin((select auth.uid())));

drop policy if exists "Users can read own coupon redemptions" on public.coupon_redemptions;
create policy "Users can read own coupon redemptions"
on public.coupon_redemptions
for select
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.coupons to authenticated;
grant select on public.coupon_redemptions to authenticated;

revoke all on function public.get_my_loyalty_benefits() from public;
grant execute on function public.get_my_loyalty_benefits() to authenticated;

revoke all on function public.validate_coupon_for_checkout(text, numeric, numeric) from public;
grant execute on function public.validate_coupon_for_checkout(text, numeric, numeric) to anon, authenticated;

revoke all on function public.create_order_with_stock(jsonb, jsonb, jsonb) from public;
grant execute on function public.create_order_with_stock(jsonb, jsonb, jsonb) to authenticated;

revoke all on function public.sync_coupon_redemption_from_order() from public;

notify pgrst, 'reload schema';

-- =============================================================================
-- DRIFT DE SCHEMA EN PRODUCCIÓN — documentado post-auditoría (2026-06-10)
-- NO dropear estas columnas; existen en producción y no rompen nada con 0 datos.
-- =============================================================================

-- COLUMNAS LEGACY en public.coupons (presentes en producción, NO usadas por el sistema):
--   expires_at  timestamptz  → legacy; el sistema usa ends_at
--   used_count  integer      → legacy; el conteo real se hace en coupon_redemptions
--                              (status IN ('reserved','redeemed'))
--
-- DRIFT discount_type:
--   El DEFAULT en producción es 'percentage'::text (legacy).
--   El frontend y las RPCs usan 'percent' (sin 'age').
--   El constraint coupons_discount_type_check en el repo permite solo
--   ('percent','fixed_amount','free_shipping'), pero en producción ese
--   constraint puede no existir o la columna puede haber sido creada antes.
--   Al crear cupones via Admin, siempre pasar discount_type explícitamente.
--
-- POLICY DE RIESGO en public.loyalty_benefits:
--   "Public can read active loyalty benefits" → SELECT para anon y authenticated
--   donde is_active = true. Expone la estructura de beneficios del carnet
--   (benefit_type, coupon_id, required_purchases) a usuarios no autenticados.
--   No expone códigos de cupón directamente (eso requería también la policy
--   pública de coupons, que ya fue eliminada). Evaluar DROP en próxima sesión
--   si se confirma que el frontend solo usa get_my_loyalty_benefits() para carnet.
--
-- POLICY REDUNDANTE en public.coupons (propuesta de limpieza, no ejecutada):
--   "Admins manage coupons" (ALL, is_admin()) es redundante con las 4 granulares:
--   "Admins can read coupons" (SELECT), "Admins can insert coupons" (INSERT),
--   "Admins can update coupons" (UPDATE), "Admins can delete coupons" (DELETE).
--   SQL para limpiarla cuando se decida:
--     DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
--
-- DRIFT en coupon_redemptions (documentar, NO arreglar aún):
--   order_id y code son NOT NULL en el repo SQL, pero pueden ser nullable en prod.
--   No hay unique (coupon_id, order_id) en producción (existe en el repo como
--   constraint coupon_redemptions_coupon_order_key).
--   FK coupon_redemptions.coupon_id ON DELETE RESTRICT en repo vs CASCADE en prod.
