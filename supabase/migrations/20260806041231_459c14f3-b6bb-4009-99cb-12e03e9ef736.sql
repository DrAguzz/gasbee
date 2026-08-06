DROP POLICY IF EXISTS "read ratings" ON public.ratings;

CREATE POLICY "view ratings for own orders"
ON public.ratings
FOR SELECT
TO authenticated
USING (
  customer_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = ratings.order_id
      AND (
        o.customer_id = auth.uid()
        OR o.merchant_id = public.user_merchant_id(auth.uid())
        OR o.rider_id IN (SELECT r.id FROM public.riders r WHERE r.user_id = auth.uid())
      )
  )
);