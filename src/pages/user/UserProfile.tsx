import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, MapPin, ShoppingBag, LifeBuoy, Bell, Store, Building2, ChevronRight, Mail, Camera, Loader2, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>({ full_name: "", phone: "", avatar_url: "" });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => setProfile(data ?? { full_name: "", phone: "", avatar_url: "" }));
  }, [user]);


  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (dbErr) throw dbErr;
      setProfile({ ...profile, avatar_url: publicUrl });
      toast.success("Profile picture updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const initials = (profile.full_name || user?.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      {/* Hero header */}
      <div className="glass-category-card relative overflow-hidden rounded-3xl p-5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-primary/0 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <label className="group relative h-16 w-16 shrink-0 cursor-pointer">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-xl font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background">
              <Camera className="h-3 w-3" />
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={onAvatarChange} disabled={uploading} />
          </label>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">{profile.full_name || "Welcome"}</div>
            <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-2">
        <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Account</h2>
        <div className="space-y-2">
          {[
            { to: "/user/account-settings", icon: Settings, label: "Account Settings", desc: "Personal info & account actions" },
            { to: "/user/orders", icon: ShoppingBag, label: "My Orders", desc: "Track your gas deliveries" },
            { to: "/user/addresses", icon: MapPin, label: "Addresses", desc: "Manage delivery locations" },
            { to: "/user/notifications", icon: Bell, label: "Notifications", desc: "Updates and alerts" },
            { to: "/user/apply-merchant", icon: Store, label: "Apply as Merchant", desc: "Sell on Gasbee" },
            { to: "/user/company-verification", icon: Building2, label: "Company Account", desc: "For industrial buyers" },
            { to: "/user/support", icon: LifeBuoy, label: "Support", desc: "We're here to help" },
          ].map((r) => (
            <Link key={r.to} to={r.to} className="block">
              <div className="glass-category-card group flex items-center gap-3 rounded-2xl p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/15">
                  <r.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight">{r.label}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-active:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={async () => { await signOut(); nav("/user/login"); }}
      >
        <LogOut className="mr-2 h-4 w-4" />Sign out
      </Button>
    </div>
  );
}
