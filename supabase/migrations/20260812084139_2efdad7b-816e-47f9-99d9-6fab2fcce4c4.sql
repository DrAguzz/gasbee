ALTER TABLE public.settlements
  ADD COLUMN IF NOT EXISTS delivery_fee_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee_total numeric NOT NULL DEFAULT 0;