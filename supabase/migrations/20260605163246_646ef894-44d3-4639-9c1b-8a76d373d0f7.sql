
CREATE OR REPLACE FUNCTION public.enforce_payment_before_merchant_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Admins bypass
  IF uid IS NOT NULL AND public.is_admin(uid) THEN
    RETURN NEW;
  END IF;

  -- Only enforce when payment isn't paid yet
  IF COALESCE(OLD.payment_status::text, 'pending') <> 'paid' THEN
    -- Block rider assignment
    IF NEW.rider_id IS DISTINCT FROM OLD.rider_id AND NEW.rider_id IS NOT NULL THEN
      RAISE EXCEPTION 'Cannot assign rider before payment is confirmed';
    END IF;

    -- Block merchant status transitions before payment
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      -- Allow customer self-cancel of their own pending order
      IF NEW.status::text = 'cancelled' AND uid = OLD.customer_id THEN
        RETURN NEW;
      END IF;
      -- Allow system/webhook leaving status as pending; otherwise block merchant-initiated transitions
      IF NEW.status::text IN ('accepted','rejected','preparing','assigned','rider_accepted','picked_up','on_delivery','arrived_at_merchant','arrived_at_customer','delivered','failed','cancelled') THEN
        RAISE EXCEPTION 'Cannot update order status before payment is confirmed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_before_merchant_actions ON public.orders;
CREATE TRIGGER trg_enforce_payment_before_merchant_actions
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_payment_before_merchant_actions();
