INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Email assets public read') THEN
    CREATE POLICY "Email assets public read" ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');
  END IF;
END $$;