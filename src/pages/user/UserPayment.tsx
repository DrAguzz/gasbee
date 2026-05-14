import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CreditCard } from "lucide-react";

export default function UserPayment() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase.from("orders").select("*").eq("id", id).maybeSingle().then(({ data }) => setOrder(data));
  }, [id]);

  const payNow = async () => {
    if (!order) return;
    setBusy(true);

    try {
      // Use the published domain for redirects so CHIP returns to the live app
      // (works whether we're inside the Lovable preview iframe or on the published domain).
      let redirectOrigin = window.location.origin;
      try {
        if (window.top && window.top !== window.self) {
          redirectOrigin = window.top.location.origin;
        }
      } catch {
        redirectOrigin = window.location.hostname.includes("lovableproject.com")
          ? "https://gasbee.lovable.app"
          : window.location.origin;
      }

      const { data, error } = await supabase.functions.invoke("chip-create-purchase", {
        body: {
          order_id: order.id,
          success_redirect: `${redirectOrigin}/user/orders/${order.id}?payment=success`,
          failure_redirect: `${redirectOrigin}/user/orders/${order.id}?payment=failed`,
        },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("No checkout URL");

      // Break out of any iframe (Lovable preview) by using a target="_top" anchor click.
      // This works cross-origin where window.top.location assignment is blocked,
      // and avoids loading CHIP in an iframe (which CHIP refuses via X-Frame-Options).
      const a = document.createElement("a");
      a.href = data.url;
      a.target = "_top";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to start payment");
      setBusy(false);
    }
  };

  if (!order) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-md space-y-4 p-2">
      <div className="rounded-lg bg-gradient-to-r from-primary to-primary/70 p-4 text-primary-foreground">
        <div className="text-xs opacity-80">Secure Payment Gateway</div>
        <div className="text-lg font-bold">CHIP</div>
      </div>

      <Card className="space-y-2 p-4">
        <div className="text-xs text-muted-foreground">Order reference</div>
        <div className="font-mono font-semibold">{order.code}</div>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm">
          <span>Amount due</span>
          <span className="text-lg font-bold text-primary">RM {Number(order.total_amount).toFixed(2)}</span>
        </div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Method: {order.payment_method?.toUpperCase()}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <Button className="w-full" disabled={busy} onClick={payNow}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          Pay with CHIP
        </Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => nav(`/user/orders/${order.id}`)}>
          Cancel & back to order
        </Button>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Selepas bayar, anda akan kembali ke halaman pesanan secara automatik.
      </p>
    </div>
  );
}
