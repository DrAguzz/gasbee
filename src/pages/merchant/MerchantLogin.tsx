import { MERCHANT_MANAGER_ROLES, RIDER_ROLES } from "@/hooks/useAuth";
import { LoginCard } from "@/components/auth/LoginCard";
export default function MerchantLogin() {
  return <LoginCard title="Gasbee - Merchant & Rider Login" subtitle="Manage orders, products, delivery tasks, stock updates, and daily operations in one place." expectedRoles={[...MERCHANT_MANAGER_ROLES, ...RIDER_ROLES]} />;
}
