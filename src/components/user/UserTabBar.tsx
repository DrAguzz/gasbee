import { NavLink, useLocation } from "react-router-dom";
import { Home, ShoppingBag, User, Bell, Flame } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/user/home", label: "Home", icon: Home },
  { to: "/user/products", label: "Shop", icon: Flame },
  { to: "/user/orders", label: "My Order", icon: ShoppingBag },
  { to: "/user/notifications", label: "Alerts", icon: Bell },
  { to: "/user/profile", label: "Profile", icon: User },
];

export default function UserTabBar() {
  const { pathname } = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  const activeIdx = tabs.findIndex((t) => pathname.startsWith(t.to));

  useLayoutEffect(() => {
    const idx = activeIdx >= 0 ? activeIdx : 0;
    const el = itemRefs.current[idx];
    const parent = containerRef.current;
    if (!el || !parent) return;
    const er = el.getBoundingClientRect();
    const pr = parent.getBoundingClientRect();
    setIndicator({ left: er.left - pr.left, width: er.width });
  }, [activeIdx]);

  useEffect(() => {
    const onResize = () => {
      const idx = activeIdx >= 0 ? activeIdx : 0;
      const el = itemRefs.current[idx];
      const parent = containerRef.current;
      if (!el || !parent) return;
      const er = el.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      setIndicator({ left: er.left - pr.left, width: er.width });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIdx]);

  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <nav
        ref={containerRef}
        className="glass-tabbar pointer-events-auto relative grid grid-cols-5 rounded-[28px] px-2 py-2"
      >
        {/* Active liquid pill indicator */}
        {indicator && (
          <span
            aria-hidden
            className="glass-tab-pill absolute top-1.5 bottom-1.5 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{ left: indicator.left + 6, width: indicator.width - 12 }}
          />
        )}
        {tabs.map((t, i) => {
          const isActive = i === activeIdx;
          const Icon = t.icon;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              ref={(el) => (itemRefs.current[i] = el)}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition-colors duration-300",
                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-transform",
                  isActive && "animate-tab-pop drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]",
                )}
                strokeWidth={isActive ? 2.4 : 2}
              />
              <span className={cn("transition-all", isActive ? "opacity-100 font-semibold" : "opacity-80")}>
                {t.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
