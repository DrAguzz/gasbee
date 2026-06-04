-- 1) order_credits: remove self-update
DROP POLICY IF EXISTS "user update own credits" ON public.order_credits;

-- 2) STORAGE: rider-docs
DROP POLICY IF EXISTS "public read rider-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth upload rider-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth update rider-docs" ON storage.objects;
DROP POLICY IF EXISTS "auth delete rider-docs" ON storage.objects;

CREATE POLICY "rider-docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'rider-docs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.riders r
      WHERE ((storage.foldername(name))[1] = r.id::text
             OR (storage.foldername(name))[2] = r.id::text)
        AND (r.user_id = auth.uid() OR r.merchant_id = public.user_merchant_id(auth.uid()))
    )
  )
);
CREATE POLICY "rider-docs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rider-docs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.riders r
      WHERE ((storage.foldername(name))[1] = r.id::text
             OR (storage.foldername(name))[2] = r.id::text)
        AND (r.user_id = auth.uid() OR r.merchant_id = public.user_merchant_id(auth.uid()))
    )
  )
);
CREATE POLICY "rider-docs update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'rider-docs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.riders r
      WHERE ((storage.foldername(name))[1] = r.id::text
             OR (storage.foldername(name))[2] = r.id::text)
        AND r.merchant_id = public.user_merchant_id(auth.uid())
    )
  )
);
CREATE POLICY "rider-docs delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'rider-docs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.riders r
      WHERE ((storage.foldername(name))[1] = r.id::text
             OR (storage.foldername(name))[2] = r.id::text)
        AND r.merchant_id = public.user_merchant_id(auth.uid())
    )
  )
);

-- 3) STORAGE: company-docs (path: 'u-<uid>/...')
DROP POLICY IF EXISTS "public read company docs" ON storage.objects;
DROP POLICY IF EXISTS "auth upload company docs" ON storage.objects;
CREATE POLICY "company-docs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-docs' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = ('u-' || auth.uid()::text)
  )
);
CREATE POLICY "company-docs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-docs' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = ('u-' || auth.uid()::text)
  )
);
CREATE POLICY "company-docs update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-docs' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = ('u-' || auth.uid()::text)
  )
);
CREATE POLICY "company-docs delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-docs' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = ('u-' || auth.uid()::text)
  )
);

-- 4) STORAGE: delivery-proofs (path: 'order-<id>/...' or 'refund-<id>/...')
DROP POLICY IF EXISTS "delivery proofs public read" ON storage.objects;
DROP POLICY IF EXISTS "delivery proofs auth upload" ON storage.objects;
DROP POLICY IF EXISTS "delivery proofs auth update" ON storage.objects;
CREATE POLICY "delivery-proofs read" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'delivery-proofs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE ('order-' || o.id::text) = (storage.foldername(name))[1]
        AND (o.customer_id = auth.uid()
             OR o.merchant_id = public.user_merchant_id(auth.uid())
             OR o.rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.refunds rf
      JOIN public.orders o ON o.id = rf.order_id
      WHERE ('refund-' || rf.id::text) = (storage.foldername(name))[1]
        AND (rf.requester_id = auth.uid()
             OR o.merchant_id = public.user_merchant_id(auth.uid())
             OR rf.pickup_rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid()))
    )
  )
);
CREATE POLICY "delivery-proofs insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs' AND (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE ('order-' || o.id::text) = (storage.foldername(name))[1]
        AND o.rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.refunds rf
      WHERE ('refund-' || rf.id::text) = (storage.foldername(name))[1]
        AND rf.pickup_rider_id IN (SELECT id FROM public.riders WHERE user_id = auth.uid())
    )
  )
);
CREATE POLICY "delivery-proofs update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'delivery-proofs' AND public.is_admin(auth.uid()));

-- 5) STORAGE: merchant-logos (path[1] = merchant_id)
DROP POLICY IF EXISTS "auth upload merchant-logos" ON storage.objects;
DROP POLICY IF EXISTS "auth update merchant-logos" ON storage.objects;
DROP POLICY IF EXISTS "auth delete merchant-logos" ON storage.objects;
CREATE POLICY "merchant-logos insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'merchant-logos' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);
CREATE POLICY "merchant-logos update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'merchant-logos' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);
CREATE POLICY "merchant-logos delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'merchant-logos' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);

-- 6) STORAGE: product-images
DROP POLICY IF EXISTS "auth upload product-images" ON storage.objects;
DROP POLICY IF EXISTS "auth update product-images" ON storage.objects;
DROP POLICY IF EXISTS "auth delete product-images" ON storage.objects;
CREATE POLICY "product-images insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);
CREATE POLICY "product-images update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'product-images' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);
CREATE POLICY "product-images delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images' AND (
    public.is_admin(auth.uid())
    OR (storage.foldername(name))[1] = public.user_merchant_id(auth.uid())::text
  )
);

-- 7) MERCHANTS: restrict + public view
DROP POLICY IF EXISTS "public read active merchants" ON public.merchants;
CREATE POLICY "owner admin staff read merchants" ON public.merchants FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_admin(auth.uid()) OR id = public.user_merchant_id(auth.uid()));

CREATE OR REPLACE VIEW public.merchants_public
WITH (security_invoker = on) AS
SELECT id, name, slug, logo_url, description, address, city, state, postcode,
       latitude, longitude, delivery_radius_km, total_orders, rating, status, created_at, updated_at
FROM public.merchants
WHERE status = 'active';

-- Ensure view is accessible (security_invoker means base table policy still applies; we need a separate policy allowing read of active rows).
-- Re-add a policy on base that allows read for active rows but ONLY of non-sensitive columns via column privileges.
GRANT SELECT (id, name, slug, logo_url, description, address, city, state, postcode,
              latitude, longitude, delivery_radius_km, total_orders, rating, status, created_at, updated_at, owner_id, commission_rate, documents)
  ON public.merchants TO authenticated;
-- Withhold SELECT on email and phone columns from authenticated (revoke any default)
REVOKE SELECT (email, phone) ON public.merchants FROM authenticated;
-- And add policy permitting selecting active merchants (column grants gate the sensitive fields)
CREATE POLICY "read active merchants nonsensitive" ON public.merchants FOR SELECT TO authenticated
USING (status = 'active');

-- 8) RIDERS: restrict + public view (hide license, GPS, phone from non owner/manager)
DROP POLICY IF EXISTS "view riders" ON public.riders;
CREATE POLICY "view riders restricted" ON public.riders FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR (
    merchant_id = public.user_merchant_id(auth.uid())
    AND (public.has_role(auth.uid(), 'merchant_owner') OR public.has_role(auth.uid(), 'merchant_manager'))
  )
);
-- Allow merchant_staff to see safe rider columns only
GRANT SELECT (id, full_name, profile_image_url, vehicle_type, vehicle_plate, status, is_active,
              total_deliveries, rating, merchant_id, user_id, created_at, updated_at)
  ON public.riders TO authenticated;
REVOKE SELECT (license_no, license_image_url, license_expiry_date, current_lat, current_lng, phone)
  ON public.riders FROM authenticated;
CREATE POLICY "staff read riders nonsensitive" ON public.riders FOR SELECT TO authenticated
USING (merchant_id = public.user_merchant_id(auth.uid()));

CREATE OR REPLACE VIEW public.riders_public
WITH (security_invoker = on) AS
SELECT id, full_name, profile_image_url, vehicle_type, vehicle_plate, status, is_active,
       total_deliveries, rating, merchant_id, user_id, created_at, updated_at
FROM public.riders;

-- 9) PROMOTIONS: admin-only read + redemption RPC
DROP POLICY IF EXISTS "read active promotions" ON public.promotions;
CREATE POLICY "admin read promotions" ON public.promotions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_promotion(_code text)
RETURNS TABLE(id uuid, code text, type promotion_type, value numeric, min_order_amount numeric,
              max_discount numeric, applies_to text, merchant_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.code, p.type, p.value, p.min_order_amount, p.max_discount, p.applies_to, p.merchant_id
  FROM public.promotions p
  WHERE p.is_active = true
    AND upper(p.code) = upper(trim(_code))
    AND (p.starts_at IS NULL OR p.starts_at <= now())
    AND (p.ends_at IS NULL OR p.ends_at >= now())
    AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.validate_promotion(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promotion(text) TO authenticated;

-- 10) Function hardening
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_rating_aggregates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_stock_on_paid() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_rider_assigned() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_merchant_new_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_customer_order_rejected() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_payment_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_promotion_usage() FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.merchants_public TO authenticated, anon;
GRANT SELECT ON public.riders_public TO authenticated;