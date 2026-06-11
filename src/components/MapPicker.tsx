import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default marker icon fix for picker mode
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

// Helper to create custom HTML markers for tracking mode
const getMarkerIcon = (label?: string, color?: string) => {
  const lbl = (label ?? "").toLowerCase();
  const isRider = lbl.includes("rider") || lbl.includes("🛵");
  const isMerchant = lbl.includes("merchant");

  if (isRider) {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-white shadow-lg border-2 border-white animate-pulse">
          <span class="text-base">🛵</span>
        </div>
      `,
      className: "custom-rider-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  if (isMerchant) {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white">
          <span class="text-base">🏪</span>
        </div>
      `,
      className: "custom-merchant-icon",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  // Default destination/home pin
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center w-9 h-9 rounded-full bg-red-500 text-white shadow-lg border-2 border-white">
        <span class="text-base">📍</span>
      </div>
    `,
    className: "custom-destination-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange?: (lat: number, lng: number) => void;
  height?: number;
  readOnly?: boolean;
  markers?: { lat: number; lng: number; label?: string; color?: string }[];
  radiusKm?: number | null;
}

export function MapPicker({ lat, lng, onChange, height = 260, readOnly, markers, radiusKm }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const extraRef = useRef<L.Marker[]>([]);
  const circleRef = useRef<L.Circle | null>(null);
  const routeLinesRef = useRef<L.Polyline[]>([]);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const center: [number, number] = [lat ?? 3.139, lng ?? 101.6869]; // KL default
    const map = L.map(ref.current).setView(center, lat && lng ? 16 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
    mapRef.current = map;

    if (lat != null && lng != null) {
      if (!(readOnly && markers && markers.length > 0)) {
        markerRef.current = L.marker([lat, lng], { icon: defaultIcon, draggable: !readOnly }).addTo(map);
      }
      if (!readOnly && markerRef.current) {
        markerRef.current.on("dragend", (e) => {
          const p = (e.target as L.Marker).getLatLng();
          onChange?.(p.lat, p.lng);
        });
      }
    }
    if (!readOnly) {
      map.on("click", (e) => {
        const { lat: la, lng: ln } = e.latlng;
        if (!markerRef.current) {
          markerRef.current = L.marker([la, ln], { icon: defaultIcon, draggable: true }).addTo(map);
          markerRef.current.on("dragend", (ev) => {
            const p = (ev.target as L.Marker).getLatLng();
            onChange?.(p.lat, p.lng);
          });
        } else markerRef.current.setLatLng([la, ln]);
        onChange?.(la, ln);
      });
    }
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker AND recenter map when prop changes externally (e.g. GPS update)
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    if (readOnly && markers && markers.length > 0) {
      const currentZoom = mapRef.current.getZoom();
      mapRef.current.setView([lat, lng], Math.max(currentZoom, 16), { animate: true });
      return;
    }
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: defaultIcon, draggable: !readOnly }).addTo(mapRef.current);
      if (!readOnly) {
        markerRef.current.on("dragend", (e) => {
          const p = (e.target as L.Marker).getLatLng();
          onChange?.(p.lat, p.lng);
        });
      }
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.setView([lat, lng], Math.max(currentZoom, 16), { animate: true });
  }, [lat, lng, readOnly, markers]);

  // Extra markers
  useEffect(() => {
    if (!mapRef.current) return;
    extraRef.current.forEach((m) => m.remove());
    extraRef.current = [];
    (markers ?? []).forEach((m) => {
      const customIcon = getMarkerIcon(m.label, m.color);
      const mk = L.marker([m.lat, m.lng], { icon: customIcon, title: m.label }).addTo(mapRef.current!);
      if (m.label) {
        mk.bindTooltip(m.label, {
          permanent: true,
          direction: "top",
          className: "bg-popover text-popover-foreground border border-border shadow-md rounded px-2 py-0.5 text-xs font-semibold"
        });
      }
      extraRef.current.push(mk);
    });
    // Fit bounds if multiple points
    const all: L.LatLngExpression[] = [];
    if (lat != null && lng != null) all.push([lat, lng]);
    (markers ?? []).forEach((m) => all.push([m.lat, m.lng]));
    if (all.length > 1) mapRef.current.fitBounds(L.latLngBounds(all as any), { padding: [40, 40] });
  }, [markers, lat, lng]);

  // Fetch and draw route between markers
  useEffect(() => {
    if (!mapRef.current || !readOnly || !markers || markers.length < 2) {
      routeLinesRef.current.forEach((line) => {
        try { line.remove(); } catch (e) {}
      });
      routeLinesRef.current = [];
      return;
    }

    let active = true;

    const fetchAndDrawRoute = async () => {
      routeLinesRef.current.forEach((line) => {
        try { line.remove(); } catch (e) {}
      });
      routeLinesRef.current = [];

      // Sort or organize coords so Rider is first if present
      let sortedMarkers = [...markers];
      const riderIdx = sortedMarkers.findIndex(m => 
        (m.label ?? "").toLowerCase().includes("rider") || 
        (m.label ?? "").includes("🛵")
      );
      if (riderIdx > 0) {
        const [riderMarker] = sortedMarkers.splice(riderIdx, 1);
        sortedMarkers.unshift(riderMarker);
      }

      const coordsString = sortedMarkers
        .map((m) => `${m.lng},${m.lat}`)
        .join(";");

      try {
        const response = await fetch(
          `https://router.projectosrm.org/route/v1/driving/${coordsString}?geometries=geojson&overview=full`
        );
        if (!response.ok) throw new Error("OSRM API error");

        const data = await response.json();
        if (!active || !mapRef.current) return;

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
          const routeCoords = data.routes[0].geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );

          const hasRider = markers.some((m) =>
            (m.label ?? "").toLowerCase().includes("rider") ||
            (m.label ?? "").includes("🛵")
          );

          const colorGlow = hasRider ? "#fbbf24" : "#60a5fa"; // amber vs blue
          const colorMain = hasRider ? "#d97706" : "#2563eb"; // dark amber vs dark blue

          const glowLine = L.polyline(routeCoords, {
            color: colorGlow,
            weight: 8,
            opacity: 0.3,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapRef.current);

          const mainLine = L.polyline(routeCoords, {
            color: colorMain,
            weight: 4,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapRef.current);

          routeLinesRef.current = [glowLine, mainLine];
        } else {
          throw new Error("Invalid route");
        }
      } catch (err) {
        console.warn("OSRM route fetch failed, using straight fallback:", err);
        if (!active || !mapRef.current) return;

        const straightCoords = sortedMarkers.map((m) => [m.lat, m.lng] as [number, number]);
        const fallbackLine = L.polyline(straightCoords, {
          color: "#94a3b8",
          weight: 3,
          dashArray: "5, 10",
          opacity: 0.8,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(mapRef.current);

        routeLinesRef.current = [fallbackLine];
      }
    };

    fetchAndDrawRoute();

    return () => {
      active = false;
    };
  }, [markers, readOnly]);

  // Coverage radius circle
  useEffect(() => {
    if (!mapRef.current) return;
    if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
    if (lat == null || lng == null || !radiusKm || radiusKm <= 0) return;
    circleRef.current = L.circle([lat, lng], {
      radius: radiusKm * 1000,
      color: "#2563eb",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.15,
    }).addTo(mapRef.current);
    mapRef.current.fitBounds(circleRef.current.getBounds(), { padding: [20, 20] });
  }, [lat, lng, radiusKm]);

  return <div ref={ref} style={{ height, width: "100%" }} className="rounded-md border" />;
}
