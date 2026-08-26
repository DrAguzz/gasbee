CREATE TABLE public.rider_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  deliveries_count integer NOT NULL DEFAULT 0,
  delivery_fee_total numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  net_payout numeric NOT NULL DEFAULT 0,
  status settlement_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  notes text,
  chip_send_instruction_id bigint,
  payout_state text,
  payout_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_settlements TO authenticated;
GRANT ALL ON public.rider_settlements TO service_role;

ALTER TABLE public.rider_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage rider settlements"
ON public.rider_settlements FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Riders view own settlements"
ON public.rider_settlements FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_settlements.rider_id AND r.user_id = auth.uid()));

CREATE TRIGGER trg_rider_settlements_updated
BEFORE UPDATE ON public.rider_settlements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_rider_settlements_rider ON public.rider_settlements(rider_id, period_end DESC);

INSERT INTO public.app_settings (key, value) VALUES
  ('rider_commission_type', '"percent"'::jsonb),
  ('rider_commission_value', '0'::jsonb)
ON CONFLICT (key) DO NOTHING;