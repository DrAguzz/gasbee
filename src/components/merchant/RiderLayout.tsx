import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Home, Truck, Bell, User, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { RiderJobAlert } from "@/components/merchant/RiderJobAlert";

const tabs = [
  { to: "/merchant/rider-dashboard", label: "Home", icon: Home },
  { to: "/merchant/rider/active-delivery", label: "Active", icon: Truck },
  { to: "/merchant/rider/notifications", label: "Alerts", icon: Bell },
  { to: "/merchant/rider/profile", label: "Profile", icon: User },
];

export default function RiderLayout() {
  const { signOut } = useAuth();
  const nav = useNavigate();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-20">
      <RiderJobAlert />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold">Gasbee Rider</span>
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/merchant/login"); }}><LogOut className="h-4 w-4" /></Button>
      </header>
      <main className="flex-1 p-4"><Outlet /></main>
      <div className="text-center text-[10px] text-muted-foreground py-1">Version 2.0.0</div>
      <nav className="fixed bottom-0 left-1/2 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t bg-background">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `flex flex-col items-center gap-1 py-2 text-xs ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
            <t.icon className="h-5 w-5" />{t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
