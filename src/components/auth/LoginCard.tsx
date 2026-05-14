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
import { Eye, EyeOff } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  expectedRoles?: AppRole[];
  showSignup?: boolean;
  signupLink?: string;
}


export const LoginCard = ({ title, subtitle, expectedRoles, showSignup, signupLink }: Props) => {

  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        {showSignup && signupLink && (
          <p className="mt-4 text-center text-sm text-foreground/90">
            New here?{" "}
            <a
              href={signupLink}
              className="font-semibold text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Create an account
            </a>
          </p>
        )}
      </Card>
    </div>
  );
};
