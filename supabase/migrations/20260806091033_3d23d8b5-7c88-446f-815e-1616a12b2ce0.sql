CREATE TABLE public.payout_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type text NOT NULL CHECK (owner_type IN ('merchant','rider')),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE CASCADE,
  rider_id uuid REFERENCES public.riders(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  account_number text NOT NULL,
  bank_code text NOT NULL,
  email text,
  reference text,
  chip_bank_account_id bigint,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  is_default boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_owner_ref CHECK (
    (owner_type = 'merchant' AND merchant_id IS NOT NULL AND rider_id IS NULL)
    OR (owner_type = 'rider' AND rider_id IS NOT NULL AND merchant_id IS NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_bank_accounts TO authenticated;
GRANT ALL ON public.payout_bank_accounts TO service_role;

ALTER TABLE public.payout_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all payout bank accounts"
ON public.payout_bank_accounts FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Merchant staff manage own payout bank accounts"
ON public.payout_bank_accounts FOR ALL TO authenticated
USING (owner_type = 'merchant' AND merchant_id = public.user_merchant_id(auth.uid()))
WITH CHECK (owner_type = 'merchant' AND merchant_id = public.user_merchant_id(auth.uid()));

CREATE POLICY "Riders manage own payout bank accounts"
ON public.payout_bank_accounts FOR ALL TO authenticated
USING (owner_type = 'rider' AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
WITH CHECK (owner_type = 'rider' AND rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()));

CREATE TRIGGER trg_payout_bank_accounts_updated
BEFORE UPDATE ON public.payout_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX payout_bank_accounts_chip_id_idx
ON public.payout_bank_accounts (chip_bank_account_id)
WHERE chip_bank_account_id IS NOT NULL;

ALTER TABLE public.settlements
  ADD COLUMN chip_send_instruction_id bigint,
  ADD COLUMN payout_state text,
  ADD COLUMN payout_error text;