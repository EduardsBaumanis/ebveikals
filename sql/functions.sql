-- ============================================================
-- functions.sql
-- Triggers and stored procedures.
-- Run this AFTER schema.sql.
-- ============================================================

-- ------------------------------------------------------------
-- update_updated_at()
-- Trigger function that keeps the "updated_at" column current.
-- ------------------------------------------------------------
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on products;
create trigger trg_products_updated_at
  before update on products
  for each row
  execute function update_updated_at();

drop trigger if exists trg_orders_updated_at on orders;
create trigger trg_orders_updated_at
  before update on orders
  for each row
  execute function update_updated_at();

-- ------------------------------------------------------------
-- generate_order_number()
-- Builds a short, human-friendly order number such as
-- "KER-20260522-AB12". Called by the server when creating an order,
-- but also available as a trigger fallback if the column is empty.
-- ------------------------------------------------------------
create or replace function generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.public_order_number is null then
    new.public_order_number :=
      'KER-' ||
      to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 4));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_order_number on orders;
create trigger trg_orders_order_number
  before insert on orders
  for each row
  execute function generate_order_number();

-- ------------------------------------------------------------
-- reduce_stock_after_payment(p_order_id uuid)
--
-- Called by the Klix webhook AFTER a payment is confirmed.
--
-- This function is the heart of safe stock handling. It must:
--   * run in a single transaction (a PL/pgSQL function does);
--   * only act on orders that are currently 'pending_payment'
--     (this is what makes it IDEMPOTENT - calling it twice for the
--      same order does nothing the second time);
--   * reduce each product's quantity_left, never below zero;
--   * mark a product 'sold_out' when it reaches zero;
--   * set the order to 'paid' and record paid_at;
--   * write an order_event so we have an audit trail.
--
-- Returns true if stock was reduced, false if the call was a no-op
-- (for example a duplicate webhook for an already-paid order).
-- ------------------------------------------------------------
create or replace function reduce_stock_after_payment(p_order_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_status text;
  v_item   record;
begin
  -- Lock the order row so two concurrent webhooks cannot both proceed.
  select status into v_status
  from orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  -- Idempotency guard: only a pending order may be processed.
  -- If it is already paid (duplicate webhook), do nothing.
  if v_status <> 'pending_payment' then
    insert into order_events (order_id, event_type, event_data)
    values (p_order_id, 'stock_reduce_skipped',
            jsonb_build_object('reason', 'order_not_pending', 'status', v_status));
    return false;
  end if;

  -- Reduce stock for each order item. Lock product rows too.
  for v_item in
    select oi.product_id, oi.quantity
    from order_items oi
    where oi.order_id = p_order_id
      and oi.product_id is not null
  loop
    update products
    set quantity_left = greatest(quantity_left - v_item.quantity, 0),
        status = case
                   when greatest(quantity_left - v_item.quantity, 0) = 0 then 'sold_out'
                   else status
                 end
    where id = v_item.product_id;
  end loop;

  -- Mark the order as paid.
  update orders
  set status  = 'paid',
      paid_at = now()
  where id = p_order_id;

  -- Audit trail.
  insert into order_events (order_id, event_type, event_data)
  values (p_order_id, 'stock_reduced', jsonb_build_object('processed_at', now()));

  return true;
end;
$$;
