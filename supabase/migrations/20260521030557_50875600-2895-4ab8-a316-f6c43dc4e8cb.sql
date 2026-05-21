-- Notify merchant + admins when an order's payment status changes
-- (e.g. paid, failed, refunded) so they always know the real job state.

CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  status_label text;
  notif_title text;
  notif_body text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN

    status_label := CASE NEW.payment_status::text
      WHEN 'paid' THEN 'Payment received'
      WHEN 'failed' THEN 'Payment failed / rejected'
      WHEN 'refunded' THEN 'Payment refunded'
      WHEN 'partial_refund' THEN 'Payment partially refunded'
      ELSE 'Payment ' || NEW.payment_status::text
    END;

    notif_title := status_label || ' · ' || NEW.code;
    notif_body := 'Order ' || NEW.code
      || ' total RM ' || COALESCE(NEW.total_amount::text,'0')
      || ' — payment status is now ' || NEW.payment_status::text || '.';

    -- Notify merchant staff
    INSERT INTO public.notifications (user_id, title, body, type, link)
    SELECT ur.user_id, notif_title, notif_body, 'order',
           '/merchant/orders/' || NEW.id
    FROM public.user_roles ur
    WHERE ur.merchant_id = NEW.merchant_id
      AND ur.role IN ('merchant_owner','merchant_manager','merchant_staff');

    -- Notify admins
    INSERT INTO public.notifications (user_id, title, body, type, link)
    SELECT ur.user_id, notif_title, notif_body, 'order',
           '/admin/orders/' || NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('super_admin','admin','operation_admin','finance_admin','support_admin');

    -- Notify the customer too if it failed/refunded
    IF NEW.payment_status::text IN ('failed','refunded','partial_refund') THEN
      INSERT INTO public.notifications (user_id, title, body, type, link)
      VALUES (NEW.customer_id, notif_title, notif_body, 'order',
              '/user/orders/' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_payment_status_change ON public.orders;
CREATE TRIGGER trg_notify_payment_status_change
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_change();