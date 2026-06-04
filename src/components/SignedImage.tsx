import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = new Set(["rider-docs", "company-docs", "delivery-proofs"]);

function extractPath(url: string, bucket: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/object/(?:public|sign)/${bucket}/([^?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function useSignedUrl(url: string | null | undefined, bucket: string, expires = 3600) {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!url) { setSigned(null); return; }
    if (!PRIVATE_BUCKETS.has(bucket)) { setSigned(url); return; }
    const path = extractPath(url, bucket);
    if (!path) { setSigned(url); return; }
    supabase.storage.from(bucket).createSignedUrl(path, expires).then(({ data }) => {
      if (alive) setSigned(data?.signedUrl ?? null);
    });
    return () => { alive = false; };
  }, [url, bucket, expires]);
  return signed;
}

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { url?: string | null; bucket: string };
export function SignedImage({ url, bucket, ...rest }: ImgProps) {
  const signed = useSignedUrl(url, bucket);
  if (!signed) return null;
  return <img src={signed} {...rest} />;
}

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { url?: string | null; bucket: string };
export function SignedLink({ url, bucket, children, ...rest }: LinkProps) {
  const signed = useSignedUrl(url, bucket);
  if (!signed) return null;
  return <a href={signed} {...rest}>{children}</a>;
}
