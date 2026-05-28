import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playBeep } from "@/lib/sound";
import { toast } from "sonner";

export function RiderJobAlert() {
  const { user } = useAuth();
  const [rider, setRider] = useState<any>(null);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("riders")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setRider(data));

    const rch = supabase
      .channel(`rider-profile-alert-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "riders", filter: `user_id=eq.${user.id}` }, (p) => {
        setRider(p.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(rch); };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !rider || !rider.is_active || rider.status !== "online") return;
    const ch = supabase
      .channel(`rider-notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (p) => {
        const n: any = p.new;
        if (seen.current.has(n.id)) return;
        seen.current.add(n.id);
        if (n.type === "order") {
          playBeep(4);
          toast.success(`🛵 ${n.title}`, { description: n.body, duration: 8000 });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, rider?.is_active, rider?.status]);

  return null;
}
