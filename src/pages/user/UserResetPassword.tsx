import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import authBg from "@/assets/auth-bg.png";

export default function UserResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password sekurang-kurangnya 6 aksara");
    if (password !== confirm) return toast.error("Password tidak sepadan");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password berjaya dikemaskini");
    await supabase.auth.signOut();
    nav("/user/login", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4" style={{ backgroundImage: `url(${authBg})` }}>
      <div className="absolute inset-0 bg-black/55" aria-hidden />
      <Card className="relative w-full max-w-md p-8 bg-card/70 backdrop-blur-2xl border-white/20">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={48} />
          <div>
            <h1 className="text-xl font-bold">Reset Password</h1>
            <p className="text-xs text-muted-foreground">Masukkan password baru anda.</p>
          </div>
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Mengesahkan pautan reset… Jika anda sampai ke sini tanpa klik pautan emel, sila mohon semula.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Password Baru</Label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Sahkan Password</Label>
              <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Menyimpan…" : "Kemaskini Password"}</Button>
          </form>
        )}
      </Card>
    </div>
  );
}
