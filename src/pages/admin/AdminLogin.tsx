import { ADMIN_ROLES } from "@/hooks/useAuth";
import { LoginCard } from "@/components/auth/LoginCard";
export default function AdminLogin() {
  return <LoginCard title="Gasbee - Admin Login" subtitle="Monitor users, merchants, riders, orders, payments, reports, and overall platform operations." expectedRoles={ADMIN_ROLES} />;
}
