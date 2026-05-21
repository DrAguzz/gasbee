import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  product_id: string;
  merchant_id: string;
  name: string;
  image_url?: string | null;
  type: "refill" | "new" | "deposit";
  cylinder_size_kg?: number | null;
  unit_price: number;
  quantity: number;
  category_slug?: string | null;
  // Breakdown for "new cylinder" purchases: cylinder + refill priced separately
  new_cylinder_price?: number | null;
  refill_price?: number | null;
};

const KEY = "gasbee_cart_v1";
export const CYLINDER_LIMIT = 2;

function read(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("gasbee-cart"));
}

export const isCylinder = (it: CartItem) => it.category_slug === "cylinder" || it.category_slug === "lpg-refill";
export const isIndustrial = (it: CartItem) => it.category_slug === "industrial-gas";

export function cylinderTotal(items: CartItem[]) {
  return items.filter(isCylinder).reduce((s, x) => s + x.quantity, 0);
}
export function hasIndustrial(items: CartItem[]) {
  return items.some(isIndustrial);
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(read());
  useEffect(() => {
    const h = () => setItems(read());
    window.addEventListener("gasbee-cart", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("gasbee-cart", h); window.removeEventListener("storage", h); };
  }, []);

  const add = useCallback((it: CartItem): { ok: boolean; error?: string } => {
    const cur = read();
    const filtered = cur.length && cur[0].merchant_id !== it.merchant_id ? [] : cur;
    const idx = filtered.findIndex((x) => x.product_id === it.product_id && x.type === it.type);
    const projected = filtered.map((x, i) => i === idx ? { ...x, quantity: x.quantity + it.quantity } : x);
    if (idx < 0) projected.push(it);

    if (isCylinder(it) && cylinderTotal(projected) > CYLINDER_LIMIT) {
      return { ok: false, error: `Maximum ${CYLINDER_LIMIT} cylinders (LPG Refill / Cylinder Gas) per transaction.` };
    }
    write(projected);
    return { ok: true };
  }, []);

  const setQty = useCallback((product_id: string, type: string, qty: number): { ok: boolean; error?: string } => {
    const cur = read();
    const projected = cur
      .map((x) => (x.product_id === product_id && x.type === type ? { ...x, quantity: qty } : x))
      .filter((x) => x.quantity > 0);
    if (cylinderTotal(projected) > CYLINDER_LIMIT) {
      return { ok: false, error: `Maximum ${CYLINDER_LIMIT} cylinders (LPG Refill / Cylinder Gas) per transaction.` };
    }
    write(projected);
    return { ok: true };
  }, []);

  const remove = useCallback((product_id: string, type: string) => {
    write(read().filter((x) => !(x.product_id === product_id && x.type === type)));
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, x) => s + x.unit_price * x.quantity, 0);
  const count = items.reduce((s, x) => s + x.quantity, 0);

  return { items, add, setQty, remove, clear, subtotal, count };
}
