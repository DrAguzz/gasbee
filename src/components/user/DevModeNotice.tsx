import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SESSION_KEY = "gasbee-dev-mode-notice";

const unwrap = (v: unknown): string => {
  if (typeof v === "string") return v;
  try { return JSON.parse(JSON.stringify(v)) as string; } catch { return String(v ?? ""); }
};

export default function DevModeNotice() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Mobile App dalam tempoh percubaan");
  const [message, setMessage] = useState(
    "Aplikasi sedang dalam pembangunan semula. Tiada penghantaran akan dilakukan sepanjang tempoh ini."
  );
  const [buttonText, setButtonText] = useState("Faham");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (sessionStorage.getItem(SESSION_KEY) === "1") return;
      } catch {}
      const { data } = await supabase.rpc("get_public_fee_settings");
      if (!active || !data) return;
      const m: Record<string, string> = {};
      (data as { key: string; value: unknown }[]).forEach((r) => { m[r.key] = unwrap(r.value); });
      const enabled = String(m.dev_mode_enabled ?? "false").toLowerCase() === "true";
      if (!enabled) return;
      if (m.dev_mode_title) setTitle(m.dev_mode_title);
      if (m.dev_mode_message) setMessage(m.dev_mode_message);
      if (m.dev_mode_button) setButtonText(m.dev_mode_button);
      setOpen(true);
    })();
    return () => { active = false; };
  }, []);

  const acknowledge = () => {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
    setOpen(false);
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={acknowledge}>{buttonText}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
