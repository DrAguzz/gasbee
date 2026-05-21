import { toast } from "sonner";

interface Opts {
  onSuccess: (lat: number, lng: number) => void;
  onStart?: () => void;
  onDone?: () => void;
}

export function getMyLocation({ onSuccess, onStart, onDone }: Opts) {
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
      toast.success("Lokasi dijumpai", { id: toastId });
      onSuccess(p.coords.latitude, p.coords.longitude);
      onDone?.();
    },
    (err) => {
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
