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
        '/merchant/rider-jobs/' || NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_rider_assigned ON public.orders;
CREATE TRIGGER trg_notify_rider_assigned
AFTER UPDATE OF rider_id ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_rider_assigned();