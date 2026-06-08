CREATE OR REPLACE FUNCTION public.enforce_payment_before_merchant_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  is_cod boolean := COALESCE(OLD.payment_method::text, NEW.payment_method::text) = 'cod';
  is_paid boolean := COALESCE(OLD.payment_status::text, 'pending') = 'paid';
  accepted_statuses text[] := ARRAY['accepted','preparing','assigned','rider_accepted','arrived_at_merchant','picked_up','on_delivery','arrived_at_customer','delivered'];
  order_accepted boolean := COALESCE(OLD.status::text, '') = ANY(accepted_statuses);
BEGIN
  -- Admins bypass
  IF uid IS NOT NULL AND public.is_admin(uid) THEN
    RETURN NEW;
  END IF;

  -- Rider assignment rules
  IF NEW.rider_id IS DISTINCT FROM OLD.rider_id AND NEW.rider_id IS NOT NULL THEN
    IF is_cod THEN
      IF NOT order_accepted THEN
        RAISE EXCEPTION 'Cannot assign rider before COD order is accepted';
      END IF;
    ELSE
      IF NOT is_paid THEN
        RAISE EXCEPTION 'Cannot assign rider before payment is confirmed';
      END IF;
      IF NOT order_accepted THEN
        RAISE EXCEPTION 'Cannot assign rider before order is accepted';
      END IF;
    END IF;
  END IF;

  -- Status transition rules: only block online (non-COD) unpaid orders from merchant transitions
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT is_cod AND NOT is_paid THEN
    -- Allow customer self-cancel of their own pending order
    IF NEW.status::text = 'cancelled' AND uid = OLD.customer_id THEN
      RETURN NEW;
    END IF;
    IF NEW.status::text IN ('accepted','rejected','preparing','assigned','rider_accepted','picked_up','on_delivery','arrived_at_merchant','arrived_at_customer','delivered','failed','cancelled') THEN
      RAISE EXCEPTION 'Cannot update order status before payment is confirmed';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;