
ALTER VIEW public.merchants_public SET (security_invoker = off);
ALTER VIEW public.riders_public SET (security_invoker = off);
GRANT SELECT ON public.merchants_public TO anon, authenticated;
GRANT SELECT ON public.riders_public TO anon, authenticated;
