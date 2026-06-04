import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip, useMap } from "react-leaflet";
import L from "leaflet";

// Selangor, Malaysia bounding box
const SELANGOR_BOUNDS = L.latLngBounds(
  [2.6, 100.8] as [number, number],
  [3.85, 101.95] as [number, number],
);
const SELANGOR_CENTER: [number, number] = [3.0738, 101.5183];

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(SELANGOR_BOUNDS, { padding: [20, 20], animate: false });
  }, [map]);
  return null;
}

import "leaflet/dist/leaflet.css";
import {
  AlertTriangle, Maximize2, RefreshCw,
} from "lucide-react";

const fmtMYR = (n: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n: number) => new Intl.NumberFormat("en-MY").format(n || 0);

const COLORS = ["#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"];

function Panel({ title, children, className = "", action }: any) {
  return (
    <div className={`flex min-h-0 flex-col rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/90 backdrop-blur p-2 shadow-xl ${className}`}>
      <div className="mb-1.5 flex items-center justify-between shrink-0">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400">{title}</h3>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function StatPill({ label, value, sub, tone = "amber" }: any) {
  const tones: any = {
    amber: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/30",
    green: "from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/30",
    red: "from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/30",
    blue: "from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/30",
    violet: "from-violet-500/20 to-violet-500/5 text-violet-300 border-violet-500/30",
  };
  return (
    <div className={`rounded-lg border bg-gradient-to-br px-2 py-1.5 ${tones[tone]}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80 leading-tight">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums leading-tight">{value}</div>
      {sub && <div className="text-[9px] opacity-70 leading-tight truncate">{sub}</div>}
    </div>
  );
}

export default function LiveMonitoring() {
  const [now, setNow] = useState(new Date());
  const [orders, setOrders] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<{
    morning: { temp: number; code: number } | null;
    evening: { temp: number; code: number } | null;
    max: number;
    min: number;
  } | null>(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Weather (Selangor) — Open-Meteo, no API key
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=3.0738&longitude=101.5183&hourly=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKuala_Lumpur&forecast_days=1"
        );
        const j = await res.json();
        const times: string[] = j.hourly?.time || [];
        const temps: number[] = j.hourly?.temperature_2m || [];
        const codes: number[] = j.hourly?.weather_code || [];
        const pick = (hour: number) => {
          const idx = times.findIndex((t) => t.endsWith(`T${String(hour).padStart(2, "0")}:00`));
          if (idx < 0) return null;
          return { temp: Math.round(temps[idx]), code: codes[idx] };
        };
        setWeather({
          morning: pick(8),
          evening: pick(18),
          max: Math.round(j.daily?.temperature_2m_max?.[0]),
          min: Math.round(j.daily?.temperature_2m_min?.[0]),
        });
      } catch {}
    };
    fetchWeather();
    const t = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const weatherLabel = (code?: number) => {
    if (code == null) return "—";
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if ([45, 48].includes(code)) return "Foggy";
    if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
    if ([95, 96, 99].includes(code)) return "Thunderstorm";
    return "Cloudy";
  };
  const weatherIcon = (code?: number) => {
    if (code == null) return "·";
    if (code === 0) return "☀️";
    if ([1, 2].includes(code)) return "🌤️";
    if (code === 3) return "☁️";
    if ([45, 48].includes(code)) return "🌫️";
    if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️";
    if ([95, 96, 99].includes(code)) return "⛈️";
    return "🌥️";
  };



  const load = async () => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [o, m, r, p, rf, st] = await Promise.all([
      supabase.from("orders").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
      supabase.from("merchants").select("id,name,city,state,latitude,longitude,total_orders,rating,status"),
      supabase.from("riders").select("id,full_name,total_deliveries,rating,status,is_active,merchant_id"),
      supabase.from("products").select("id,name,merchant_id,stock_qty,low_stock_threshold,is_active"),
      supabase.from("refunds").select("id,status,amount,created_at").gte("created_at", since),
      supabase.from("settlements").select("id,status,net_payout,commission_amount,merchant_id,created_at").gte("created_at", since),
    ]);
    setOrders(o.data || []);
    setMerchants(m.data || []);
    setRiders(r.data || []);
    setProducts(p.data || []);
    setRefunds(rf.data || []);
    setSettlements(st.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const ch = supabase
      .channel("live-monitoring")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  // ===== Derivations =====
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);
  const completed = orders.filter((o) => o.status === "delivered");
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const pending = orders.filter((o) => ["pending", "merchant_accepted", "rider_accepted", "assigned"].includes(o.status));
  const inTransit = orders.filter((o) => ["picked_up", "on_delivery", "arrived_at_customer"].includes(o.status));

  const revenueToday = todayOrders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const revenueMonth = orders
    .filter((o) => o.payment_status === "paid" && new Date(o.created_at).getMonth() === now.getMonth() && new Date(o.created_at).getFullYear() === now.getFullYear())
    .reduce((s, o) => s + Number(o.total_amount || 0), 0);

  // Hourly trend (today)
  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, orders: 0, revenue: 0 }));
    todayOrders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      buckets[h].orders += 1;
      if (o.payment_status === "paid") buckets[h].revenue += Number(o.total_amount || 0);
    });
    return buckets;
  }, [orders]);

  const peakHour = hourly.reduce((a, b) => (b.orders > a.orders ? b : a), hourly[0]);

  // Daily 14d
  const daily = useMemo(() => {
    const days: any[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      const dayOrders = orders.filter((o) => new Date(o.created_at) >= d && new Date(o.created_at) < next);
      days.push({
        day: d.toLocaleDateString("en-MY", { day: "2-digit", month: "short" }),
        orders: dayOrders.length,
        revenue: dayOrders.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_amount || 0), 0),
      });
    }
    return days;
  }, [orders]);

  // Revenue by merchant
  const revByMerchant = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter((o) => o.payment_status === "paid").forEach((o) => {
      map.set(o.merchant_id, (map.get(o.merchant_id) || 0) + Number(o.total_amount || 0));
    });
    return Array.from(map.entries())
      .map(([id, total]) => ({ name: merchants.find((m) => m.id === id)?.name || "—", total }))
      .sort((a, b) => b.total - a.total).slice(0, 6);
  }, [orders, merchants]);

  // Revenue by area
  const revByArea = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter((o) => o.payment_status === "paid").forEach((o) => {
      const area = o.address_snapshot?.city || o.address_snapshot?.state || "Unknown";
      map.set(area, (map.get(area) || 0) + Number(o.total_amount || 0));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [orders]);

  // Status distribution
  const statusDist = [
    { name: "Pending", value: pending.length, color: "#f59e0b" },
    { name: "In Transit", value: inTransit.length, color: "#3b82f6" },
    { name: "Completed", value: completed.length, color: "#10b981" },
    { name: "Cancelled", value: cancelled.length, color: "#ef4444" },
    { name: "Refunds", value: refunds.length, color: "#8b5cf6" },
  ];

  // Rider performance
  const riderPerf = useMemo(() => {
    return riders.map((r) => {
      const delivered = orders.filter((o) => o.rider_id === r.id && o.status === "delivered");
      const failed = orders.filter((o) => o.rider_id === r.id && o.status === "cancelled");
      const avgMin = delivered.reduce((s, o) => {
        if (o.assigned_at && o.delivered_at) return s + (new Date(o.delivered_at).getTime() - new Date(o.assigned_at).getTime()) / 60000;
        return s;
      }, 0) / Math.max(1, delivered.length);
      return { id: r.id, name: r.full_name, delivered: delivered.length, failed: failed.length, avgMin: Math.round(avgMin), rating: r.rating || 0, active: r.is_active };
    }).sort((a, b) => b.delivered - a.delivered);
  }, [riders, orders]);

  const totalDelivered = riderPerf.reduce((s, r) => s + r.delivered, 0);
  const totalFailed = riderPerf.reduce((s, r) => s + r.failed, 0);
  const failedPct = totalDelivered + totalFailed > 0 ? (totalFailed / (totalDelivered + totalFailed)) * 100 : 0;
  const avgDelivery = riderPerf.length ? riderPerf.reduce((s, r) => s + (r.avgMin || 0), 0) / riderPerf.filter((r) => r.avgMin).length || 0 : 0;

  // Merchant perf
  const merchantPerf = useMemo(() => {
    return merchants.map((m) => {
      const mo = orders.filter((o) => o.merchant_id === m.id);
      const rev = mo.filter((o) => o.payment_status === "paid").reduce((s, o) => s + Number(o.total_amount || 0), 0);
      const uniqueCustomers = new Set(mo.map((o) => o.customer_id));
      const repeat = mo.length - uniqueCustomers.size;
      return { id: m.id, name: m.name, orders: mo.length, revenue: rev, repeatRate: mo.length ? (repeat / mo.length) * 100 : 0, rating: m.rating };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [merchants, orders]);

  // Heatmap points
  const heatPoints = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; city: string; count: number }>();
    orders.forEach((o) => {
      const lat = Number(o.address_snapshot?.latitude);
      const lng = Number(o.address_snapshot?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { lat, lng, city: o.address_snapshot?.city || "—", count: 1 });
    });
    return Array.from(map.values());
  }, [orders]);

  const mapCenter: [number, number] = heatPoints.length
    ? [heatPoints.reduce((s, p) => s + p.lat, 0) / heatPoints.length, heatPoints.reduce((s, p) => s + p.lng, 0) / heatPoints.length]
    : [3.139, 101.6869];

  // Inventory
  const lowStock = products.filter((p) => p.is_active && p.stock_qty <= (p.low_stock_threshold || 5));
  const fastMoving = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o: any) => {
      // can't access items here; approximate via product names absent — skip
    });
    return products.slice().sort((a, b) => (b.stock_qty || 0) - (a.stock_qty || 0)).slice(0, 6);
  }, [products]);

  // Financial
  const pendingSettlements = settlements.filter((s) => s.status === "pending");
  const totalCommission = settlements.reduce((s, x) => s + Number(x.commission_amount || 0), 0);
  const totalPayout = settlements.reduce((s, x) => s + Number(x.net_payout || 0), 0);

  // Customer analytics
  const customerStats = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => counts.set(o.customer_id, (counts.get(o.customer_id) || 0) + 1));
    const total = counts.size;
    const repeat = Array.from(counts.values()).filter((c) => c > 1).length;
    const aov = orders.length ? orders.reduce((s, o) => s + Number(o.total_amount || 0), 0) / orders.length : 0;
    return { total, repeat, newC: total - repeat, retention: total ? (repeat / total) * 100 : 0, aov };
  }, [orders]);

  // SLA
  const slaStats = useMemo(() => {
    const accepted = orders.filter((o) => o.accepted_at);
    const respMin = accepted.length
      ? accepted.reduce((s, o) => s + (new Date(o.accepted_at).getTime() - new Date(o.created_at).getTime()) / 60000, 0) / accepted.length
      : 0;
    const late = orders.filter((o) => {
      if (!o.delivered_at) return false;
      const mins = (new Date(o.delivered_at).getTime() - new Date(o.created_at).getTime()) / 60000;
      return mins > 60;
    });
    return { avgResp: Math.round(respMin), latePct: orders.length ? (late.length / orders.length) * 100 : 0, failedPct };
  }, [orders, failedPct]);

  // ===== AI predictions (heuristic projection) =====
  const predictions = useMemo(() => {
    const last7 = daily.slice(-7);
    const prev7 = daily.slice(-14, -7);
    const avgLast = last7.reduce((s, d) => s + d.orders, 0) / 7;
    const avgPrev = prev7.reduce((s, d) => s + d.orders, 0) / 7;
    const trend = avgPrev ? (avgLast - avgPrev) / avgPrev : 0;
    const predictedOrdersTomorrow = Math.max(0, Math.round(avgLast * (1 + trend)));
    const predictedRiders = Math.max(1, Math.ceil(predictedOrdersTomorrow / 8));
    const predictedRefills = Math.round(predictedOrdersTomorrow * 0.7);
    const alerts: string[] = [];
    if (lowStock.length > 0) alerts.push(`${lowStock.length} produk hampir habis stok — restock segera.`);
    if (slaStats.latePct > 15) alerts.push(`Late delivery ${slaStats.latePct.toFixed(0)}% — review rider routing.`);
    if (failedPct > 10) alerts.push(`Failed rate ${failedPct.toFixed(0)}% — check rider acceptance & merchant readiness.`);
    if (pending.length > 20) alerts.push(`${pending.length} pending orders backlog — bantu merchant accept.`);
    if (alerts.length === 0) alerts.push("Operasi stabil. Tiada anomali kritikal dikesan.");
    return { predictedOrdersTomorrow, predictedRiders, predictedRefills, trendPct: trend * 100, alerts };
  }, [daily, lowStock, slaStats, failedPct, pending]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#05070d] text-slate-100 text-xs">
      {/* Header */}
      <div className="shrink-0 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide leading-tight">Gasbee · Live Operations</div>
              <div className="text-[9px] uppercase tracking-widest text-amber-400/80 leading-tight">Real-time monitoring</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-gradient-to-br from-sky-500/20 to-sky-500/5 px-2.5 py-1 text-sky-200">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{weatherIcon(weather?.morning?.code)}</span>
                <div className="leading-tight">
                  <div className="text-[9px] uppercase tracking-widest opacity-80">Morning</div>
                  <div className="text-xs font-bold tabular-nums">
                    {weather?.morning ? `${weather.morning.temp}°C` : "—"}
                    <span className="ml-1 font-normal opacity-80">{weatherLabel(weather?.morning?.code)}</span>
                  </div>
                </div>
              </div>
              <div className="h-6 w-px bg-sky-500/30" />
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">{weatherIcon(weather?.evening?.code)}</span>
                <div className="leading-tight">
                  <div className="text-[9px] uppercase tracking-widest opacity-80">Evening</div>
                  <div className="text-xs font-bold tabular-nums">
                    {weather?.evening ? `${weather.evening.temp}°C` : "—"}
                    <span className="ml-1 font-normal opacity-80">{weatherLabel(weather?.evening?.code)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold tabular-nums leading-tight">{now.toLocaleTimeString("en-MY")}</div>
              <div className="text-[9px] uppercase tracking-widest opacity-70 leading-tight">
                {now.toLocaleDateString("en-MY", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>

            <button onClick={load} className="rounded-lg border border-white/10 bg-white/5 p-1.5 hover:bg-white/10" title="Refresh">
              <RefreshCw className="h-3 w-3" />
            </button>
            <button onClick={toggleFullscreen} className="rounded-lg border border-white/10 bg-white/5 p-1.5 hover:bg-white/10" title="Fullscreen">
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* TV grid — fits in one viewport */}
      <div className="flex-1 min-h-0 grid grid-cols-12 grid-rows-[auto_1.1fr_1.1fr_1fr] gap-2 p-2">
        {/* Row 0: KPI strip */}
        <div className="col-span-12 grid grid-cols-6 gap-2">
          <StatPill label="Orders Today" value={fmtNum(todayOrders.length)} sub={`Peak ${peakHour?.hour} · ${peakHour?.orders}`} tone="amber" />
          <StatPill label="Revenue Today" value={fmtMYR(revenueToday)} sub={`Month ${fmtMYR(revenueMonth)}`} tone="green" />
          <StatPill label="In Transit" value={fmtNum(inTransit.length)} sub={`${pending.length} pending`} tone="blue" />
          <StatPill label="Active Riders" value={fmtNum(riders.filter((r) => r.is_active).length)} sub={`Avg ${avgDelivery ? Math.round(avgDelivery) : 0} min/job`} tone="violet" />
          <StatPill label="Failed Rate" value={`${failedPct.toFixed(1)}%`} sub={`SLA late ${slaStats.latePct.toFixed(0)}%`} tone={failedPct > 10 ? "red" : "green"} />
          <StatPill label="Low Stock SKUs" value={fmtNum(lowStock.length)} sub={`${pendingSettlements.length} settlements pending`} tone={lowStock.length ? "red" : "green"} />
        </div>

        {/* Row 1: hourly | daily | status pie */}
        <Panel title="Order Trend · Hourly" className="col-span-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly} margin={{ top: 2, right: 6, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" fontSize={9} interval={2} />
              <YAxis stroke="#64748b" fontSize={9} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="orders" stroke="#f59e0b" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Revenue · Last 14 Days" className="col-span-5">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={daily} margin={{ top: 2, right: 6, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={9} interval={1} />
              <YAxis stroke="#64748b" fontSize={9} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} formatter={(v: any, n: any) => n === "revenue" ? fmtMYR(v) : v} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Order Status" className="col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={statusDist} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={2}>
                {statusDist.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 9 }} iconSize={6} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* Row 2: heatmap | top riders | merchant ranking */}
        <Panel title="Delivery Heatmap" className="col-span-5">
          <div className="h-full w-full overflow-hidden rounded-lg">
            <MapContainer center={SELANGOR_CENTER} zoom={10} minZoom={8} maxZoom={16} maxBounds={SELANGOR_BOUNDS} maxBoundsViscosity={0.8} style={{ height: "100%", width: "100%", background: "#0a0f1e" }} scrollWheelZoom={true} zoomControl={true} attributionControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              <FitBounds points={heatPoints} />
              {heatPoints.map((p, i) => (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={Math.min(24, 5 + p.count * 1.5)} pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.45, weight: 1 }}>
                  <LTooltip>{p.city} · {p.count} orders</LTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Panel>

        <Panel title="Top Riders" className="col-span-3">
          <div className="space-y-1 h-full overflow-hidden">
            {riderPerf.slice(0, 5).map((r, i) => (
              <div key={r.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-2 py-1">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-amber-500 text-slate-900" : "bg-white/10"}`}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[11px] font-semibold leading-tight">{r.name}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">⭐ {Number(r.rating).toFixed(1)} · {r.avgMin || 0}m</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-bold text-emerald-400 leading-tight">{r.delivered}</div>
                  <div className="text-[9px] text-rose-400 leading-tight">{r.failed} fail</div>
                </div>
              </div>
            ))}
            {riderPerf.length === 0 && <div className="text-center text-[10px] text-slate-500 py-4">No rider data</div>}
          </div>
        </Panel>

        <Panel title="Top Merchants" className="col-span-4">
          <div className="space-y-1 h-full overflow-hidden">
            {merchantPerf.slice(0, 5).map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-2 py-1">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[11px] font-semibold leading-tight">{m.name}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">{m.orders} ord · ⭐{Number(m.rating || 0).toFixed(1)} · rpt {m.repeatRate.toFixed(0)}%</div>
                </div>
                <div className="text-[11px] font-bold text-amber-400 whitespace-nowrap">{fmtMYR(m.revenue)}</div>
              </div>
            ))}
            {merchantPerf.length === 0 && <div className="text-center text-[10px] text-slate-500 py-4">No merchant data</div>}
          </div>
        </Panel>

        {/* Row 3: AI forecast | revenue area | inventory | financial | customer | sla */}
        <Panel
          title="AI Predictions"
          className="col-span-2 border-amber-500/30"
          action={<span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">AI</span>}
        >
          <div className="grid grid-cols-3 gap-1 mb-1">
            <StatPill label="Tomorrow" value={fmtNum(predictions.predictedOrdersTomorrow)} tone="amber" />
            <StatPill label="Riders" value={fmtNum(predictions.predictedRiders)} tone="violet" />
            <StatPill label="Refills" value={fmtNum(predictions.predictedRefills)} tone="green" />
          </div>
          <div className="space-y-1 overflow-hidden">
            {predictions.alerts.slice(0, 2).map((a, i) => (
              <div key={i} className="flex items-start gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 p-1 text-[9px] leading-tight">
                <AlertTriangle className="h-2.5 w-2.5 mt-0.5 shrink-0 text-amber-400" />
                <span className="line-clamp-2">{a}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Revenue by Area" className="col-span-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revByArea} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
              <XAxis type="number" stroke="#64748b" fontSize={9} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={9} width={60} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => fmtMYR(v)} />
              <Bar dataKey="total" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Low Stock" className="col-span-2">
          <div className="space-y-1 h-full overflow-hidden">
            {lowStock.slice(0, 4).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-1">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold leading-tight truncate">{p.name}</div>
                  <div className="text-[9px] text-slate-400 leading-tight truncate">{merchants.find((m) => m.id === p.merchant_id)?.name || "—"}</div>
                </div>
                <div className="text-right shrink-0 ml-1">
                  <div className="text-sm font-bold text-rose-300 leading-tight">{p.stock_qty}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">≤ {p.low_stock_threshold}</div>
                </div>
              </div>
            ))}
            {lowStock.length === 0 && <div className="text-center text-[10px] text-emerald-400 py-4">✓ Stok OK</div>}
          </div>
        </Panel>

        <Panel title="Financial · 30D" className="col-span-2">
          <div className="grid grid-cols-2 gap-1 h-full">
            <StatPill label="Commission" value={fmtMYR(totalCommission)} tone="amber" />
            <StatPill label="Payout" value={fmtMYR(totalPayout)} tone="green" />
            <StatPill label="Pending" value={fmtNum(pendingSettlements.length)} tone="blue" />
            <StatPill label="Refunds" value={fmtNum(refunds.length)} tone="violet" />
          </div>
        </Panel>

        <Panel title="Customers" className="col-span-2">
          <div className="grid grid-cols-2 gap-1 h-full">
            <StatPill label="New" value={fmtNum(customerStats.newC)} tone="blue" />
            <StatPill label="Repeat" value={fmtNum(customerStats.repeat)} tone="green" />
            <StatPill label="Retention" value={`${customerStats.retention.toFixed(0)}%`} tone="violet" />
            <StatPill label="AOV" value={fmtMYR(customerStats.aov)} tone="amber" />
          </div>
        </Panel>

        <Panel title="SLA" className="col-span-1">
          <div className="flex flex-col gap-1 h-full">
            <StatPill label="Resp" value={`${slaStats.avgResp}m`} tone="blue" />
            <StatPill label="Late" value={`${slaStats.latePct.toFixed(0)}%`} tone={slaStats.latePct > 15 ? "red" : "green"} />
          </div>
        </Panel>
      </div>

      {loading && <div className="fixed inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur"><div className="text-amber-400">Loading live data…</div></div>}
    </div>
  );
}
