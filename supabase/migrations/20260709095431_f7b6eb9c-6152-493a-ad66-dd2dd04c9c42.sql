
-- 1) Recreate public views as SECURITY INVOKER so they honor caller RLS
ALTER VIEW public.merchants_public SET (security_invoker = on);
ALTER VIEW public.riders_public SET (security_invoker = on);

-- Ensure anon can read merchants_public (merchants RLS already allows active rows to anon)
GRANT SELECT ON public.merchants_public TO anon, authenticated;
GRANT SELECT ON public.riders_public TO authenticated;

-- 2) Lock down app_settings reads to admins only
DROP POLICY IF EXISTS "read settings" ON public.app_settings;
CREATE POLICY "admins read settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Safe RPC exposing only the non-sensitive fee settings the checkout page needs
CREATE OR REPLACE FUNCTION public.get_public_fee_settings()
RETURNS TABLE(key text, value jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value
  FROM public.app_settings s
  WHERE s.key IN (
    'service_fee',
    'delivery_base_fee',
    'delivery_base_km',
    'delivery_per_km',
    'processing_fee'
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_fee_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fee_settings() TO anon, authenticated;
