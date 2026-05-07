import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { homeForRoles, AppRole } from "@/hooks/useAuth";
import authBg from "@/assets/auth-bg.png";

interface Props {
  title: string;
  subtitle: string;
  expectedRoles?: AppRole[];
  showSignup?: boolean;
  signupLink?: string;
  showDevPanel?: boolean;
}

const PORTAL_LINKS = [
  { label: "Customer", path: "/user/login" },
  { label: "Merchant", path: "/merchant/login" },
  { label: "Rider", path: "/merchant/login" },
  { label: "Admin", path: "/login" },
];


export const LoginCard = ({ title, subtitle, expectedRoles, showSignup, signupLink, showDevPanel = true }: Props) => {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); setBusy(false); return; }
    if (!data.user) { setBusy(false); return; }
    const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const roles = ((rolesData ?? []) as { role: AppRole }[]).map((r) => r.role);

    if (expectedRoles && !roles.some((r) => expectedRoles.includes(r))) {
      toast.error("This account is not authorised for this app.");
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    toast.success("Welcome back");
    nav(homeForRoles(roles), { replace: true });
  };


  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="absolute inset-0 bg-black/55" aria-hidden />
      <Card className="relative w-full max-w-md p-8 shadow-[var(--shadow-elegant)] bg-card/70 backdrop-blur-2xl border-white/20">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={48} />
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        {showSignup && signupLink && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here? <a href={signupLink} className="font-medium text-primary hover:underline">Create an account</a>
          </p>
        )}

        {showDevPanel && (
          <div className="mt-6 space-y-3 rounded-lg border border-dashed border-white/20 bg-background/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dev · Portals</span>
              <span className="text-[10px] text-muted-foreground">temporary</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {PORTAL_LINKS.map((p) => (
                <a
                  key={p.path}
                  href={p.path}
                  className="rounded-md border border-white/10 bg-card/50 px-2 py-1.5 text-center text-xs font-medium hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  {p.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
