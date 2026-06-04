
CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'sandbox',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin manage payment gateways"
ON public.payment_gateways
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER payment_gateways_set_updated_at
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_gateways (provider, enabled, mode, config)
VALUES ('chip', false, 'sandbox', '{"brand_id":"","api_key":"","success_redirect":"","failure_redirect":""}'::jsonb)
ON CONFLICT (provider) DO NOTHING;
