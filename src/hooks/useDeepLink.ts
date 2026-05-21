import { useEffect } from "react";
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

export function useDeepLink() {
  useEffect(() => {
    // Add App listener for URL open events
    const listener = App.addListener('appUrlOpen', async ({ url }) => {
      console.log('App opened with URL:', url);
      if (
        url.includes('payment/success') ||
        url.includes('payment/failed')
      ) {
        try {
          await Browser.close();
        } catch (e) {
          console.warn("Browser close error:", e);
        }
        window.location.href = '/user/orders';
      }
    });

    // Handle launch URL (cold start via deep link)
    App.getLaunchUrl().then(async (launchUrl) => {
      if (launchUrl && launchUrl.url) {
        const url = launchUrl.url;
        console.log('App launched with URL:', url);
        if (
          url.includes('payment/success') ||
          url.includes('payment/failed')
        ) {
          try {
            await Browser.close();
          } catch (e) {
            console.warn("Browser close error on launch:", e);
          }
          window.location.href = '/user/orders';
        }
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, []);
}
