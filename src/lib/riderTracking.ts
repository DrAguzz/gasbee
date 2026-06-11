import { Capacitor } from "@capacitor/core";
import { Geolocation, type PermissionStatus } from "@capacitor/geolocation";

export type GpsStatus =
  | "idle"
  | "permission_required"
  | "permission_denied"
  | "service_disabled"
  | "searching"
  | "active"
  | "error";

export interface RiderPosition {
  lat: number;
  lng: number;
  accuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

const isNative = () => Capacitor.isNativePlatform?.() ?? false;

export async function ensureLocationPermission(): Promise<{ granted: boolean; status: GpsStatus }> {
  try {
    if (isNative()) {
      let p: PermissionStatus = await Geolocation.checkPermissions();
      if (p.location !== "granted" && p.coarseLocation !== "granted") {
        p = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
      }
      const granted = p.location === "granted" || p.coarseLocation === "granted";
      return { granted, status: granted ? "searching" : "permission_denied" };
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return { granted: false, status: "service_disabled" };
    }
    // Web — implicit prompt on watchPosition; try a quick getCurrentPosition to trigger prompt
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve({ granted: true, status: "searching" }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) resolve({ granted: false, status: "permission_denied" });
          else resolve({ granted: false, status: "service_disabled" });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  } catch (e) {
    console.error("[riderTracking] permission error", e);
    return { granted: false, status: "error" };
  }
}

export interface WatchHandle {
  stop: () => Promise<void>;
}

export async function startLocationWatch(
  onPosition: (pos: RiderPosition) => void,
  onStatus?: (s: GpsStatus) => void
): Promise<WatchHandle | null> {
  try {
    if (isNative()) {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
        (position, err) => {
          if (err) {
            console.error("[riderTracking] native watch error", err);
            onStatus?.("error");
            return;
          }
          if (!position) return;
          onStatus?.("active");
          onPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy ?? null,
            heading: position.coords.heading ?? null,
            speed: position.coords.speed ?? null,
            timestamp: position.timestamp ?? Date.now(),
          });
        }
      );
      return {
        stop: async () => {
          try { await Geolocation.clearWatch({ id }); } catch (e) { console.error(e); }
        },
      };
    }
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      onStatus?.("service_disabled");
      return null;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => {
        onStatus?.("active");
        onPosition({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
          heading: p.coords.heading ?? null,
          speed: p.coords.speed ?? null,
          timestamp: p.timestamp ?? Date.now(),
        });
      },
      (err) => {
        console.error("[riderTracking] web watch error", err);
        if (err.code === err.PERMISSION_DENIED) onStatus?.("permission_denied");
        else onStatus?.("error");
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
    return {
      stop: async () => { navigator.geolocation.clearWatch(id); },
    };
  } catch (e) {
    console.error("[riderTracking] start watch failed", e);
    onStatus?.("error");
    return null;
  }
}
