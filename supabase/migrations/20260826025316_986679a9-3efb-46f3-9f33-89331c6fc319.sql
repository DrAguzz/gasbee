ALTER TABLE public.fund_movements
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'recorded',
  ADD COLUMN IF NOT EXISTS chip_purchase_id text,
  ADD COLUMN IF NOT EXISTS checkout_url text;

ALTER TABLE public.fund_movements DROP CONSTRAINT IF EXISTS fund_movements_status_check;
ALTER TABLE public.fund_movements ADD CONSTRAINT fund_movements_status_check
  CHECK (status IN ('recorded','pending','paid','failed'));

CREATE INDEX IF NOT EXISTS fund_movements_chip_purchase_id_idx ON public.fund_movements (chip_purchase_id);