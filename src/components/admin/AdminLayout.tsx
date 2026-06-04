import { ReactNode, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Users, Store, FileCheck2, Bike,
  Package, Tags, Boxes, CreditCard, Undo2, Wallet, Percent,
  Image as ImageIcon, Megaphone, BarChart3, Bell, LifeBuoy, Settings, ScrollText, LogOut, ShieldCheck, Menu, MonitorPlay,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const groups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/live-monitoring", label: "Live Monitoring", icon: MonitorPlay },
      { to: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/orders", label: "Orders", icon: ShoppingBag },
      { to: "/refunds", label: "Refunds", icon: Undo2 },
      { to: "/support-tickets", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: Tags },
      { to: "/inventory-overview", label: "Inventory", icon: Boxes },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/customers", label: "Customers", icon: Users },
      { to: "/merchants", label: "Merchants", icon: Store },
      { to: "/merchant-applications", label: "Applications", icon: FileCheck2 },
      { to: "/company-verifications", label: "Company Verify", icon: FileCheck2 },
      { to: "/riders", label: "Riders", icon: Bike },
    ],
  },
  {
    label: "Finance",
    items: [
      { to: "/payments", label: "Payments", icon: CreditCard },
      { to: "/payment-gateway", label: "Payment Gateway", icon: CreditCard },
      { to: "/settlements", label: "Settlements", icon: Wallet },
      { to: "/commissions", label: "Commissions", icon: Percent },
    ],
  },
  {
    label: "Marketing",
    items: [
      { to: "/banners", label: "Banners", icon: ImageIcon },
      { to: "/promotions", label: "Promotions", icon: Megaphone },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admins", label: "Admin Users", icon: ShieldCheck },
      { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

const allItems = groups.flatMap((g) => g.items);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <Logo size={36} />
        <div>
          <div className="text-sm font-bold">Gasbee HQ</div>
          <div className="text-[10px] uppercase tracking-wider opacity-60">Admin</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g, gi) => (
          <div key={g.label} className={gi === 0 ? "" : "mt-4"}>
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50">
              {g.label}
            </div>
            <div className="space-y-0.5">
              {g.items.map((it) => (
                <NavLink key={it.to} to={it.to} end onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
                               : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                  <it.icon className="h-4 w-4" />{it.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 truncate px-2 text-xs opacity-70">{user?.email}</div>
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={async () => { await signOut(); nav("/login"); }}>
          <LogOut className="mr-2 h-4 w-4" />Sign out
        </Button>
        <div className="mt-2 text-center text-[10px] opacity-50">Version 2.0.0</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const current = allItems.find((i) => i.to === pathname)?.label ?? "Admin";
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 md:flex">
        <SidebarContent />
      </aside>
      <main className="flex-1 overflow-x-auto">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="text-sm font-semibold">{current}</span>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 md:p-8">{children ?? <Outlet />}</div>
      </main>
    </div>
  );
}
