import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function PaymentBridge() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get("status") || "success";
  const orderId = searchParams.get("order_id");

  useEffect(() => {
    if (!orderId) {
      navigate("/user/home");
      return;
    }

    // Try to trigger deep link to return to native app
    const deepLinkUrl = `gasbee://payment-${status}?order_id=${orderId}`;
    window.location.href = deepLinkUrl;

    // Fallback for standard web users (or if deep link takes time/fails)
    const timer = setTimeout(() => {
      navigate(`/user/orders/${orderId}?payment=${status}`);
    }, 4000);

    return () => clearTimeout(timer);
  }, [status, orderId, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-background p-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <h2 className="text-xl font-semibold">Processing Payment Redirect...</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Returning you to the Gasbee app. If the app doesn't open automatically, click the button below.
      </p>
      {orderId && (
        <a
          href={`gasbee://payment-${status}?order_id=${orderId}`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Open Gasbee App
        </a>
      )}
    </div>
  );
}
