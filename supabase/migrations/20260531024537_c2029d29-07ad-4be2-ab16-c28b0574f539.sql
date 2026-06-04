
ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS max_discount numeric,
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS merchant_id uuid;

-- Increment used_count automatically when an order is created with a promo code
CREATE OR REPLACE FUNCTION public.increment_promotion_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.promotion_code IS NOT NULL AND length(trim(NEW.promotion_code)) > 0 THEN
    UPDATE public.promotions
      SET used_count = used_count + 1, updated_at = now()
      WHERE upper(code) = upper(trim(NEW.promotion_code));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_increment_promotion_usage ON public.orders;
CREATE TRIGGER trg_increment_promotion_usage
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.increment_promotion_usage();
