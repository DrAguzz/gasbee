import { CUSTOMER_ROLES } from "@/hooks/useAuth";
import { LoginCard } from "@/components/auth/LoginCard";
export default function UserLogin() {
  return <LoginCard title="Gasbee - User Login" subtitle="Order gas, track your delivery status, view purchase history, and manage your account easily." expectedRoles={CUSTOMER_ROLES} showSignup signupLink="/user/register" />;
}
