import { useSearchParams } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function PaymentFailed() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");

  const handleReturn = () => {
    window.location.href = "gasbee://payment/failed";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-muted/50 to-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-8 shadow-xl text-center backdrop-blur-sm">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive animate-pulse">
            <XCircle className="h-16 w-16" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
          Payment Failed
        </h1>
        
        <p className="text-muted-foreground mb-6">
          We couldn't process your payment. Please check your payment details or try another method.
        </p>

        {orderId && (
          <div className="mb-6 rounded-lg bg-muted p-3 text-xs text-muted-foreground border border-border/30">
            Order ID: <span className="font-mono font-medium text-foreground">{orderId}</span>
          </div>
        )}

        <button
          onClick={handleReturn}
          className="w-full py-3 px-4 rounded-xl bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/95 transition-colors shadow-lg shadow-destructive/20 active:scale-[0.98] duration-100"
        >
          Return to the App
        </button>
      </div>
    </div>
  );
}
