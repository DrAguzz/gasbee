CREATE OR REPLACE FUNCTION public.notify_merchant_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT ur.user_id,
         'New order ' || NEW.code,
         'Total: RM ' || COALESCE(NEW.total_amount::text,'0') || ' · ' || COALESCE(NEW.address_snapshot->>'recipient_name',''),
         'order',
         '/merchant/orders/' || NEW.id
  FROM public.user_roles ur
  WHERE ur.merchant_id = NEW.merchant_id
    AND ur.role IN ('merchant_owner','merchant_manager','merchant_staff');

  INSERT INTO public.notifications (user_id, title, body, type, link)
  SELECT r.user_id,
         'New job available ' || NEW.code,
         'Pickup ready soon · ' || COALESCE(NEW.address_snapshot->>'city',''),
         'order',
         '/merchant/rider/jobs'
  FROM public.riders r
  WHERE r.merchant_id = NEW.merchant_id
    AND r.user_id IS NOT NULL
    AND r.is_active = true;

  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.notify_rider_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rider_user uuid;
BEGIN
  IF NEW.rider_id IS NOT NULL AND NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN
    SELECT user_id INTO rider_user FROM public.riders WHERE id = NEW.rider_id;
    IF rider_user IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (
        rider_user,
        'New active job ' || NEW.code,
        'You have been assigned to deliver order ' || NEW.code || ' · ' || COALESCE(NEW.address_snapshot->>'city',''),
        'order',
        '/merchant/rider/jobs/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;