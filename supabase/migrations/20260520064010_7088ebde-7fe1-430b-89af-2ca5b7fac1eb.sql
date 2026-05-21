ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_fee numeric NOT NULL DEFAULT 0;