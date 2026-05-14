import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Eye, EyeOff, Check, X } from "lucide-react";

function evaluatePassword(pw: string) {
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  let label = "Very weak";
  let tone = "bg-destructive";
  if (score >= 5) { label = "Strong"; tone = "bg-primary"; }
  else if (score === 4) { label = "Good"; tone = "bg-primary/70"; }
  else if (score === 3) { label = "Fair"; tone = "bg-amber-500"; }
  else if (score === 2) { label = "Weak"; tone = "bg-orange-500"; }
  return { checks, score, label, tone, percent: (score / 5) * 100 };
}

export default function UserRegister() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => evaluatePassword(password), [password]);
  const confirmMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }
    if (strength.score < 3) {
      toast.error("Please choose a stronger password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/user/home`,
        data: { full_name: fullName, phone },
      },
    });
    setBusy(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists") || error.status === 422) {
        toast.error("Email sudah didaftarkan. Sila log masuk.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Account created. You can log in now.");
    nav("/user/login");
  };

  const Rule = ({ ok, text }: { ok: boolean; text: string }) => (
    <li className="flex items-center gap-1.5 text-xs">
      {ok ? <Check className="h-3 w-3 text-primary" /> : <X className="h-3 w-3 text-muted-foreground" />}
      <span className={ok ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </li>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/40 p-4">
      <Card className="w-full max-w-md p-8 shadow-[var(--shadow-elegant)]">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={48} />
          <div><h1 className="text-xl font-bold">Create account</h1><p className="text-xs text-muted-foreground">Join Gasbee</p></div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Full name</Label><Input required value={fullName} onChange={(e)=>setFullName(e.target.value)} /></div>
          <div><Label>Phone</Label><Input required value={phone} onChange={(e)=>setPhone(e.target.value)} /></div>
          <div><Label>Email</Label><Input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} /></div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Password strength</span>
                  <span className="font-medium">{strength.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${strength.tone}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
                  <Rule ok={strength.checks.length} text="At least 8 characters" />
                  <Rule ok={strength.checks.upper} text="Uppercase letter" />
                  <Rule ok={strength.checks.lower} text="Lowercase letter" />
                  <Rule ok={strength.checks.number} text="Number" />
                  <Rule ok={strength.checks.symbol} text="Symbol" />
                </ul>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e)=>setConfirmPassword(e.target.value)}
                className="pr-10"
                aria-invalid={confirmMismatch}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmMismatch && (
              <p className="mt-1 text-xs text-destructive">Passwords do not match.</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={busy || confirmMismatch || strength.score < 3}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">Already have an account? <a href="/user/login" className="font-medium text-primary hover:underline">Sign in</a></p>
      </Card>
    </div>
  );
}
