import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SignedImage } from "@/components/SignedImage";

interface Props {
  bucket: string;
  pathPrefix?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  accept?: string;
  aspect?: "square" | "wide";
}

export function ImageUpload({ bucket, pathPrefix = "", value, onChange, label = "Upload image", accept = "image/*", aspect = "square" }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const key = `${pathPrefix}${pathPrefix ? "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(key, file, { upsert: false, contentType: file.type });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    onChange(data.publicUrl);
    setBusy(false);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <SignedImage url={value} bucket={bucket} alt="" className={`rounded-md border object-cover ${aspect === "square" ? "h-32 w-32" : "h-32 w-full"}`} />
          <button type="button" onClick={() => onChange(null)} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="h-3 w-3" /></button>
        </div>
      ) : (
        <div className={`flex items-center justify-center rounded-md border border-dashed text-muted-foreground ${aspect === "square" ? "h-32 w-32" : "h-32 w-full"}`}><Upload className="h-6 w-6" /></div>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={onPick} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
        <Upload className="mr-1 h-3 w-3" />{busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}
