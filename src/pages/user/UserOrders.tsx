import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Package, Store, Calendar, ChevronRight, Download } from "lucide-react";
import { downloadReceipt } from "@/lib/receipt";
import { toast } from "sonner";

export default function UserOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("*, merchants(name)").eq("customer_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data ?? []));
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">My Orders</h1>
        <span className="text-[11px] text-muted-foreground">{orders.length} total</span>
      </div>
      <div className="space-y-2.5">
        {orders.map((o) => (
          <div key={o.id} className="glass-category-card group flex items-center gap-3 rounded-2xl p-3">
            <Link to={`/user/orders/${o.id}`} className="flex flex-1 items-center gap-3 min-w-0">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold leading-tight">{o.code}</span>
                  <StatusBadge value={o.status} />
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Store className="h-3 w-3" />
                  <span className="truncate">{o.merchants?.name ?? "—"}</span>
                  <span className="text-muted-foreground/40">•</span>
                  <Calendar className="h-3 w-3" />
                  <span className="truncate">{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-1 text-sm font-bold text-primary">RM {Number(o.total_amount).toFixed(2)}</div>
              </div>
            </Link>
            {o.payment_status === "paid" ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); downloadReceipt(o.id).catch((err) => toast.error(err.message)); }}
                className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                aria-label="Download receipt"
                title="Download receipt"
              >
                <Download className="h-4 w-4" />
              </button>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
        {orders.length === 0 && (
          <div className="glass-category-card rounded-2xl p-6 text-center">
            <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
