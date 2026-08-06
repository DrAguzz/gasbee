-- 1) Item price recomputation ------------------------------------------------
CREATE OR REPLACE FUNCTION public.order_item_price_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  p record;
  expected numeric;
BEGIN
  IF uid IS NULL OR public.is_admin(uid) THEN RETURN NEW; END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = NEW.order_id AND o.merchant_id = public.user_merchant_id(uid)
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;

  SELECT pr.name, pr.selling_price, pr.refill_price, pr.new_cylinder_price,
         pr.deposit_amount, pr.is_active, c.slug AS category_slug
    INTO p
  FROM public.products pr
  LEFT JOIN public.categories c ON c.id = pr.category_id
  WHERE pr.id = NEW.product_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid product'; END IF;
  IF p.is_active IS NOT TRUE THEN RAISE EXCEPTION 'Product is not available'; END IF;
  IF NEW.quantity IS NULL OR NEW.quantity < 1 OR NEW.quantity > 100 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  expected := CASE
    WHEN p.category_slug = 'accessories' THEN COALESCE(p.selling_price, 0)
    WHEN p.category_slug = 'lpg-refill' THEN COALESCE(p.refill_price, 0)
    WHEN NEW.type = 'new_cylinder' THEN COALESCE(NULLIF(p.new_cylinder_price, 0), p.selling_price, 0) + COALESCE(p.refill_price, 0)
    WHEN NEW.type = 'deposit' THEN COALESCE(p.deposit_amount, 0)
    ELSE COALESCE(p.refill_price, 0)
  END;

  NEW.unit_price := ROUND(expected, 2);
  NEW.subtotal := ROUND(expected * NEW.quantity, 2);
  NEW.product_name := COALESCE(NULLIF(TRIM(NEW.product_name), ''), p.name);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_item_price_guard ON public.order_items;
CREATE TRIGGER trg_order_item_price_guard
BEFORE INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_item_price_guard();

-- 2) Order insert guard --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setting_numeric(_key text, _default numeric)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(COALESCE(s.value->>'value', s.value #>> '{}'), '')::numeric
     FROM public.app_settings s WHERE s.key = _key),
    _default
  );
$$;

CREATE OR REPLACE FUNCTION public.order_insert_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR public.is_admin(uid) THEN RETURN NEW; END IF;
  IF NEW.merchant_id = public.user_merchant_id(uid) THEN RETURN NEW; END IF;

  IF NEW.customer_id IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'Cannot create an order for another user';
  END IF;

  NEW.payment_status := 'pending';
  NEW.status := 'pending';
  NEW.rider_id := NULL;
  NEW.accepted_at := NULL;
  NEW.rejected_at := NULL;
  NEW.assigned_at := NULL;
  NEW.picked_up_at := NULL;
  NEW.delivered_at := NULL;
  NEW.cancelled_at := NULL;
  NEW.proof_of_delivery_url := NULL;
  NEW.failure_reason := NULL;

  NEW.service_fee := public.setting_numeric('service_fee', 0);
  NEW.processing_fee := public.setting_numeric('processing_fee', 0);
  NEW.delivery_fee := LEAST(GREATEST(COALESCE(NEW.delivery_fee, 0), public.setting_numeric('delivery_base_fee', 0)), 500);
  NEW.discount := GREATEST(COALESCE(NEW.discount, 0), 0);
  NEW.items_subtotal := 0;
  NEW.total_amount := 0;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_insert_guard ON public.orders;
CREATE TRIGGER trg_order_insert_guard
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.order_insert_guard();

-- 3) Recompute order totals from authoritative item prices ---------------------
CREATE OR REPLACE FUNCTION public.order_recalc_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record;
  s numeric := 0;
  promo numeric := 0;
  credit numeric := 0;
  allowed numeric := 0;
  v record;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF o.payment_status <> 'pending' OR o.status <> 'pending' THEN RETURN NEW; END IF;

  SELECT COALESCE(SUM(subtotal), 0) INTO s FROM public.order_items WHERE order_id = o.id;

  IF o.promotion_code IS NOT NULL AND length(trim(o.promotion_code)) > 0 THEN
    SELECT * INTO v FROM public.validate_promotion(o.promotion_code) LIMIT 1;
    IF FOUND THEN
      promo := CASE
        WHEN v.type = 'percent' THEN LEAST(s * v.value / 100, COALESCE(v.max_discount, s))
        WHEN v.type = 'flat' THEN v.value
        ELSE COALESCE(o.delivery_fee, 0)
      END;
      IF v.min_order_amount IS NOT NULL AND s < v.min_order_amount THEN promo := 0; END IF;
    END IF;
  END IF;
  promo := GREATEST(COALESCE(promo, 0), 0);

  SELECT COALESCE(SUM(amount), 0) INTO credit
  FROM public.order_credits
  WHERE user_id = o.customer_id AND (status = 'active' OR used_order_id = o.id);

  allowed := LEAST(COALESCE(o.discount, 0), promo + credit);

  PERFORM set_config('app.order_recalc', '1', true);
  UPDATE public.orders
     SET items_subtotal = s,
         discount = ROUND(allowed, 2),
         total_amount = GREATEST(0, ROUND(s + COALESCE(o.delivery_fee,0) + COALESCE(o.service_fee,0) + COALESCE(o.processing_fee,0) - allowed, 2))
   WHERE id = o.id;
  PERFORM set_config('app.order_recalc', '0', true);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_recalc_totals ON public.order_items;
CREATE TRIGGER trg_order_recalc_totals
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.order_recalc_totals();

-- 4) Restrict what customers may change after checkout -------------------------
CREATE OR REPLACE FUNCTION public.orders_customer_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR public.is_admin(uid) THEN RETURN NEW; END IF;
  IF COALESCE(current_setting('app.order_recalc', true), '0') = '1' THEN RETURN NEW; END IF;
  IF OLD.merchant_id = public.user_merchant_id(uid) THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.riders r WHERE r.id = OLD.rider_id AND r.user_id = uid) THEN RETURN NEW; END IF;

  IF uid = OLD.customer_id THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.total_amount IS DISTINCT FROM OLD.total_amount
       OR NEW.items_subtotal IS DISTINCT FROM OLD.items_subtotal
       OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
       OR NEW.service_fee IS DISTINCT FROM OLD.service_fee
       OR NEW.processing_fee IS DISTINCT FROM OLD.processing_fee
       OR NEW.discount IS DISTINCT FROM OLD.discount
       OR NEW.rider_id IS DISTINCT FROM OLD.rider_id
       OR NEW.merchant_id IS DISTINCT FROM OLD.merchant_id
       OR NEW.customer_id IS DISTINCT FROM OLD.customer_id
       OR NEW.code IS DISTINCT FROM OLD.code
       OR NEW.promotion_code IS DISTINCT FROM OLD.promotion_code
       OR NEW.proof_of_delivery_url IS DISTINCT FROM OLD.proof_of_delivery_url
       OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
       OR NEW.rejected_at IS DISTINCT FROM OLD.rejected_at
       OR NEW.picked_up_at IS DISTINCT FROM OLD.picked_up_at THEN
      RAISE EXCEPTION 'Customers cannot modify protected order fields';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (NEW.status::text = 'cancelled' AND OLD.status::text IN ('pending','accepted')) THEN
      RAISE EXCEPTION 'Customers may only cancel a pending order';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_orders_customer_update_guard ON public.orders;
CREATE TRIGGER trg_orders_customer_update_guard
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_customer_update_guard();

-- 5) Safe store-credit redemption ---------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_order_credit(_credit_id uuid, _order_id uuid, _applied numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  c record;
  leftover numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO c FROM public.order_credits
   WHERE id = _credit_id AND user_id = uid AND status = 'active'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not available'; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = _order_id AND o.customer_id = uid) THEN
    RAISE EXCEPTION 'Invalid order';
  END IF;

  _applied := LEAST(GREATEST(COALESCE(_applied, 0), 0), c.amount);
  leftover := GREATEST(0, c.amount - _applied);

  UPDATE public.order_credits
     SET status = 'used',
         used_order_id = _order_id,
         leftover_amount = leftover,
         notes = CASE WHEN leftover > 0 THEN 'Leftover RM ' || leftover::text || ' to be refunded by admin' ELSE NULL END
   WHERE id = _credit_id;

  RETURN leftover;
END $$;

CREATE OR REPLACE FUNCTION public.refund_order_credit(_credit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.order_credits
     SET status = 'refunded', notes = 'User chose full refund'
   WHERE id = _credit_id AND user_id = uid AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Credit not available'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.redeem_order_credit(uuid, uuid, numeric) FROM public;
REVOKE ALL ON FUNCTION public.refund_order_credit(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_order_credit(uuid, uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_order_credit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.setting_numeric(text, numeric) TO authenticated, anon, service_role;