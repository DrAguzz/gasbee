import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Camera } from "lucide-react";
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

// Compress image client-side: max 1600px on longest edge, JPEG ~0.8
async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    let { width, height } = bitmap;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", quality)
    );
    if (!blob) return file;
    if (blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function ImageUpload({ bucket, pathPrefix = "", value, onChange, label = "Upload image", accept = "image/*", aspect = "square" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) { toast.error("Max 20MB"); return; }
    setBusy(true);
    const compressed = await compressImage(file);
    const ext = (compressed.type === "image/jpeg" ? "jpg" : (compressed.name.split(".").pop() || "jpg"));
    const key = `${pathPrefix}${pathPrefix ? "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(key, compressed, { upsert: false, contentType: compressed.type });
    if (error) { toast.error(error.message); setBusy(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(key);
    onChange(data.publicUrl);
    setBusy(false);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
    if (e.target) e.target.value = "";
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
      <input ref={fileRef} type="file" accept={accept} className="hidden" onChange={onPick} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => camRef.current?.click()} disabled={busy}>
          <Camera className="mr-1 h-3 w-3" />{busy ? "Uploading…" : "Camera"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          <Upload className="mr-1 h-3 w-3" />{busy ? "Uploading…" : label}
        </Button>
      </div>
    </div>
  );
}
