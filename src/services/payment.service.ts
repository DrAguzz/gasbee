import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

export const isNative = Capacitor.isNativePlatform();

export interface PaymentOptions {
  orderId: string;
}

export async function createAndOpenPayment({ orderId }: PaymentOptions): Promise<{ url?: string; error?: any }> {
  try {
    const vercelOrigin = import.meta.env.VITE_VERCEL_URL || 'https://gasbee.vercel.app';

    const success_redirect = isNative
      ? `${vercelOrigin}/payment-success?order_id=${orderId}`
      : `${window.location.origin}/payment-success?order_id=${orderId}`;

    const failure_redirect = isNative
      ? `${vercelOrigin}/payment-failed?order_id=${orderId}`
      : `${window.location.origin}/payment-failed?order_id=${orderId}`;

    const { data, error } = await supabase.functions.invoke("chip-create-purchase", {
      body: {
        order_id: orderId,
        success_redirect,
        failure_redirect,
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error("Failed to generate payment URL");

    if (isNative) {
      // Open inside the in-app browser
      await Browser.open({ url: data.url });
    } else {
      // Break out of Lovable preview iframe
      const a = document.createElement("a");
      a.href = data.url;
      a.target = "_top";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    return { url: data.url };
  } catch (err: any) {
    console.error("Payment error:", err);
    return { error: err };
  }
}

export async function closePaymentBrowser() {
  if (isNative) {
    try {
      await Browser.close();
    } catch (e) {
      console.warn("Could not close browser, maybe not open:", e);
    }
  }
}
