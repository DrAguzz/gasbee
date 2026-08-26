CREATE TABLE public.fund_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  direction text NOT NULL CHECK (direction IN ('collect_to_bank','bank_to_chip')),
  amount numeric NOT NULL CHECK (amount > 0),
  moved_at date NOT NULL DEFAULT CURRENT_DATE,
  reference text,
  notes text,
  proof_url text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fund_movements TO authenticated;
GRANT ALL ON public.fund_movements TO service_role;

ALTER TABLE public.fund_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view fund movements"
  ON public.fund_movements FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert fund movements"
  ON public.fund_movements FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update fund movements"
  ON public.fund_movements FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete fund movements"
  ON public.fund_movements FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_fund_movements_updated
  BEFORE UPDATE ON public.fund_movements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_fund_movements_moved_at ON public.fund_movements (moved_at DESC);