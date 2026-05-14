import { Outlet, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { Logo } from "@/components/Logo";
import UserTabBar from "@/components/user/UserTabBar";

export default function UserLayout() {
  const nav = useNavigate();
  const { count } = useCart();
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background pb-28">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur">
        <button onClick={() => nav("/user/home")} className="flex items-center gap-2">
          <Logo size={32} />
          <span className="font-bold">Gasbee</span>
        </button>
        <Button variant="ghost" size="icon" className="relative" onClick={() => nav("/user/cart")}>
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{count}</span>}
        </Button>
      </header>
      <main className="flex-1 p-4"><Outlet /></main>
      <div className="pb-24 text-center text-[10px] text-muted-foreground py-1">Version 2.0.0</div>
      <UserTabBar />
    </div>
  );
}

