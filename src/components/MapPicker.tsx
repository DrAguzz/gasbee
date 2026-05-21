import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default marker icon fix
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41],
});

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

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const center: [number, number] = [lat ?? 3.139, lng ?? 101.6869]; // KL default
    const map = L.map(ref.current).setView(center, lat && lng ? 16 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" }).addTo(map);
    mapRef.current = map;

    if (lat != null && lng != null) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: !readOnly }).addTo(map);
      if (!readOnly) markerRef.current.on("dragend", (e) => {
        const p = (e.target as L.Marker).getLatLng();
        onChange?.(p.lat, p.lng);
      });
    }
    if (!readOnly) {
      map.on("click", (e) => {
        const { lat: la, lng: ln } = e.latlng;
        if (!markerRef.current) {
          markerRef.current = L.marker([la, ln], { icon, draggable: true }).addTo(map);
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
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon, draggable: !readOnly }).addTo(mapRef.current);
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
  }, [lat, lng, readOnly]);

  // Extra markers
  useEffect(() => {
    if (!mapRef.current) return;
    extraRef.current.forEach((m) => m.remove());
    extraRef.current = [];
    (markers ?? []).forEach((m) => {
      const mk = L.marker([m.lat, m.lng], { icon, title: m.label }).addTo(mapRef.current!);
      if (m.label) mk.bindTooltip(m.label);
      extraRef.current.push(mk);
    });
    // Fit bounds if multiple points
    const all: L.LatLngExpression[] = [];
    if (lat != null && lng != null) all.push([lat, lng]);
    (markers ?? []).forEach((m) => all.push([m.lat, m.lng]));
    if (all.length > 1) mapRef.current.fitBounds(L.latLngBounds(all as any), { padding: [40, 40] });
  }, [markers, lat, lng]);

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
