import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { NativeSettings, AndroidSettings } from "capacitor-native-settings";

interface Opts {
  onSuccess: (lat: number, lng: number) => void;
  onStart?: () => void;
  onDone?: () => void;
}

export async function getMyLocation({ onSuccess, onStart, onDone }: Opts) {
  // If running on a native Capacitor platform (Android/iOS)
  if (Capacitor.isNativePlatform()) {
    console.log("getMyLocation called. Platform: Native");
    onStart?.();
    const toastId = toast.loading("Mencari lokasi anda…");
    try {
      console.log("Checking geolocation permissions...");
      let permStatus = await Geolocation.checkPermissions();
      console.log("Geolocation permission status check result:", JSON.stringify(permStatus));

      if (permStatus.location !== "granted") {
        console.log("Permission not granted. Requesting...");
        permStatus = await Geolocation.requestPermissions();
        console.log("Geolocation permission request result:", JSON.stringify(permStatus));
      }

      if (permStatus.location !== "granted") {
        console.log("Permission denied by user.");
        toast.error("Kebenaran lokasi ditolak. Sila benarkan akses lokasi dalam tetapan peranti.", {
          id: toastId,
          duration: 6000,
          action: {
            label: "Tetapan",
            onClick: () => {
              console.log("Opening app settings...");
              NativeSettings.open({
                optionAndroid: AndroidSettings.ApplicationDetails,
              }).catch((err) => {
                console.error("Failed to open app settings:", err);
              });
            },
          },
        });
        onDone?.();
        return;
      }

      console.log("Getting current position via Capacitor Geolocation...");
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      console.log("Successfully retrieved GPS coordinates:", position.coords.latitude, position.coords.longitude);
      toast.success("Lokasi dijumpai", { id: toastId });
      onSuccess(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      const err = error as Error;
      console.error("Capacitor Geolocation error:", err);
      toast.error(`Gagal mendapatkan lokasi: ${err.message || String(err)}`, { id: toastId });
    } finally {
      onDone?.();
    }
    return;
  }

  // Fallback to web browser implementation
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    toast.error("Peranti anda tidak menyokong GPS");
    return;
  }
  if (window.isSecureContext === false) {
    toast.error("GPS hanya berfungsi pada laman HTTPS");
    return;
  }
  onStart?.();
  const toastId = toast.loading("Mencari lokasi anda…");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      console.log("Browser Geolocation success:", p.coords.latitude, p.coords.longitude);
      toast.success("Lokasi dijumpai", { id: toastId });
      onSuccess(p.coords.latitude, p.coords.longitude);
      onDone?.();
    },
    (err) => {
      console.error("Browser Geolocation error:", err);
      let msg = "Tidak dapat lokasi anda";
      if (err.code === err.PERMISSION_DENIED) msg = "Kebenaran lokasi ditolak. Sila benarkan akses lokasi dalam tetapan pelayar.";
      else if (err.code === err.POSITION_UNAVAILABLE) msg = "Lokasi tidak tersedia. Cuba di kawasan terbuka.";
      else if (err.code === err.TIMEOUT) msg = "Permintaan lokasi terlalu lama. Sila cuba lagi.";
      toast.error(msg, { id: toastId });
      onDone?.();
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}
