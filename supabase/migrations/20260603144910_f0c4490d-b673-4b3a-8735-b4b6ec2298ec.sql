-- Roll back column grants and the broad "read active" policies; rely on views for public reads.
DROP POLICY IF EXISTS "read active merchants nonsensitive" ON public.merchants;
DROP POLICY IF EXISTS "staff read riders nonsensitive" ON public.riders;

GRANT SELECT (email, phone) ON public.merchants TO authenticated;
GRANT SELECT (license_no, license_image_url, license_expiry_date, current_lat, current_lng, phone)
  ON public.riders TO authenticated;