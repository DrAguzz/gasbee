CREATE POLICY "Admins can read finance docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'finance-docs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can upload finance docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'finance-docs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update finance docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'finance-docs' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'finance-docs' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete finance docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'finance-docs' AND public.is_admin(auth.uid()));