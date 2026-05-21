-- Order credits table
CREATE TABLE IF NOT EXISTS public.order_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  source_order_id uuid NOT NULL,
  used_order_id uuid,
  status text NOT NULL DEFAULT 'active', -- active | used | refunded
  leftover_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own credits or admin" ON public.order_credits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "admin manage credits" ON public.order_credits
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "user update own credits" ON public.order_credits
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_order_credits_updated_at
  BEFORE UPDATE ON public.order_credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: customer notification + credit on rejection
CREATE OR REPLACE FUNCTION public.notify_customer_order_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND NEW.rejected_at IS NOT NULL
     AND (OLD.rejected_at IS NULL OR OLD.status <> 'cancelled') THEN
    INSERT INTO public.notifications (user_id, title, body, type, link)
    VALUES (
      NEW.customer_id,
      'Order ' || NEW.code || ' rejected by merchant',
      COALESCE('Reason: ' || NEW.failure_reason, 'The merchant rejected your order.') ||
      CASE WHEN NEW.payment_status = 'paid'
           THEN ' You have a store credit of RM ' || NEW.total_amount::text || '. Use it to order from another merchant, or request a full refund.'
           ELSE '' END,
      'order',
      '/user/orders/' || NEW.id
    );

    IF NEW.payment_status = 'paid' THEN
      INSERT INTO public.order_credits (user_id, amount, source_order_id, status)
      VALUES (NEW.customer_id, NEW.total_amount, NEW.id, 'active');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_customer_order_rejected ON public.orders;
CREATE TRIGGER trg_notify_customer_order_rejected
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_order_rejected();