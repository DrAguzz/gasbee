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
    'processing_fee',
    'dev_mode_enabled',
    'dev_mode_title',
    'dev_mode_message',
    'dev_mode_button'
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_fee_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_fee_settings() TO anon, authenticated;

INSERT INTO public.app_settings (key, value) VALUES
  ('dev_mode_enabled', '"false"'::jsonb),
  ('dev_mode_title', '"Mobile App dalam tempoh percubaan"'::jsonb),
  ('dev_mode_message', '"Aplikasi sedang dalam pembangunan semula. Tiada penghantaran akan dilakukan sepanjang tempoh ini."'::jsonb),
  ('dev_mode_button', '"Faham"'::jsonb)
ON CONFLICT (key) DO NOTHING;