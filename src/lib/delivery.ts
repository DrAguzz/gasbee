// Distance-based delivery fee with configurable base + per-km tiers.
// fee = base when distance <= baseKm, else base + (distance - baseKm) * perKm.

export type FeeConfig = {
  serviceFee: number;
  deliveryBaseFee: number;
  deliveryBaseKm: number;
  deliveryPerKm: number;
  processingFee: number;
};

export const DEFAULT_FEE_CONFIG: FeeConfig = {
  serviceFee: 5,
  deliveryBaseFee: 5,
  deliveryBaseKm: 5,
  deliveryPerKm: 1,
  processingFee: 1.5,
};

export function haversineKm(lat1?: number | null, lng1?: number | null, lat2?: number | null, lng2?: number | null): number | null {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(Number(lat1))) * Math.cos(toRad(Number(lat2))) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcDeliveryFee(opts: { distanceKm: number | null; config?: FeeConfig }) {
  const c = opts.config ?? DEFAULT_FEE_CONFIG;
  const km = opts.distanceKm ?? c.deliveryBaseKm;
  const extra = Math.max(0, km - c.deliveryBaseKm);
  const fee = c.deliveryBaseFee + extra * c.deliveryPerKm;
  return {
    fee: r2(fee),
    distanceKm: opts.distanceKm,
    extraKm: r2(extra),
    breakdown: { base: c.deliveryBaseFee, baseKm: c.deliveryBaseKm, perKm: c.deliveryPerKm, extra: r2(extra * c.deliveryPerKm) },
  };
}
