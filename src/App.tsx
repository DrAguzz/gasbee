import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, ADMIN_ROLES, MERCHANT_MANAGER_ROLES, RIDER_ROLES, CUSTOMER_ROLES } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import AdminLayout from "@/components/admin/AdminLayout";
import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import Orders from "@/pages/admin/Orders";
import OrderDetail from "@/pages/admin/OrderDetail";
import Customers from "@/pages/admin/Customers";
import CustomerDetail from "@/pages/admin/CustomerDetail";
import Merchants from "@/pages/admin/Merchants";
import MerchantApplications from "@/pages/admin/MerchantApplications";
import Riders from "@/pages/admin/Riders";
import RiderDetail from "@/pages/admin/RiderDetail";
import Products from "@/pages/admin/Products";
import Categories from "@/pages/admin/Categories";
import InventoryOverview from "@/pages/admin/InventoryOverview";
import Payments from "@/pages/admin/Payments";
import Refunds from "@/pages/admin/Refunds";
import Settlements from "@/pages/admin/Settlements";
import Commissions from "@/pages/admin/Commissions";
import Banners from "@/pages/admin/Banners";
import Promotions from "@/pages/admin/Promotions";
import Reports from "@/pages/admin/Reports";
import Notifications from "@/pages/admin/Notifications";
import SupportTickets from "@/pages/admin/SupportTickets";
import AuditLogs from "@/pages/admin/AuditLogs";
import Settings from "@/pages/admin/Settings";
import Admins from "@/pages/admin/Admins";

import UserLayout from "@/components/user/UserLayout";
import UserLogin from "@/pages/user/UserLogin";
import UserRegister from "@/pages/user/UserRegister";
import UserHome from "@/pages/user/UserHome";
import UserProducts from "@/pages/user/UserProducts";
import UserMerchants from "@/pages/user/UserMerchants";
import UserMerchantDetail from "@/pages/user/UserMerchantDetail";
import UserProductDetail from "@/pages/user/UserProductDetail";
import UserCart from "@/pages/user/UserCart";
import UserCheckout from "@/pages/user/UserCheckout";
import UserOrders from "@/pages/user/UserOrders";
import UserOrderDetail from "@/pages/user/UserOrderDetail";
import UserPayment from "@/pages/user/UserPayment";
import UserAddresses from "@/pages/user/UserAddresses";
import UserProfile from "@/pages/user/UserProfile";
import UserNotifications from "@/pages/user/UserNotifications";
import UserSupport from "@/pages/user/UserSupport";
import UserRefund from "@/pages/user/UserRefund";
import UserApplyMerchant from "@/pages/user/UserApplyMerchant";
import UserCompanyVerification from "@/pages/user/UserCompanyVerification";
import CompanyVerifications from "@/pages/admin/CompanyVerifications";

import MerchantLayout from "@/components/merchant/MerchantLayout";
import RiderLayout from "@/components/merchant/RiderLayout";
import MerchantLogin from "@/pages/merchant/MerchantLogin";
import MerchantDashboard from "@/pages/merchant/MerchantDashboard";
import MerchantOrders from "@/pages/merchant/MerchantOrders";
import MerchantOrderDetail from "@/pages/merchant/MerchantOrderDetail";
import MerchantProducts from "@/pages/merchant/MerchantProducts";
import MerchantProductForm from "@/pages/merchant/MerchantProductForm";
import MerchantInventory from "@/pages/merchant/MerchantInventory";
import MerchantInventoryMovements from "@/pages/merchant/MerchantInventoryMovements";
import MerchantRiders from "@/pages/merchant/MerchantRiders";
import MerchantStaff from "@/pages/merchant/MerchantStaff";
import MerchantSettlements from "@/pages/merchant/MerchantSettlements";
import MerchantReports from "@/pages/merchant/MerchantReports";
import MerchantProfile from "@/pages/merchant/MerchantProfile";
import MerchantSettings from "@/pages/merchant/MerchantSettings";
import MerchantNotifications from "@/pages/merchant/MerchantNotifications";
import MerchantSupport from "@/pages/merchant/MerchantSupport";
import MerchantRefunds from "@/pages/merchant/MerchantRefunds";

import RiderDashboard from "@/pages/rider/RiderDashboard";
import RiderJobs from "@/pages/rider/RiderJobs";
import RiderJobDetail from "@/pages/rider/RiderJobDetail";
import RiderActive from "@/pages/rider/RiderActive";
import RiderHistory from "@/pages/rider/RiderHistory";
import RiderEarnings from "@/pages/rider/RiderEarnings";
import RiderProfile from "@/pages/rider/RiderProfile";
import RiderNotifications from "@/pages/rider/RiderNotifications";
import RiderRefundPickups from "@/pages/rider/RiderRefundPickups";

import PlaceholderPage from "@/components/PlaceholderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Admin = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allow={ADMIN_ROLES} loginPath="/login"><AdminLayout>{children}</AdminLayout></ProtectedRoute>
);
const Customer = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allow={CUSTOMER_ROLES} loginPath="/user/login"><UserLayout />{children}</ProtectedRoute>
);
const Merchant = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allow={MERCHANT_MANAGER_ROLES} loginPath="/merchant/login"><MerchantLayout>{children}</MerchantLayout></ProtectedRoute>
);
const Rider = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute allow={RIDER_ROLES} loginPath="/merchant/login"><RiderLayout />{children}</ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster /><Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ===== ADMIN ===== */}
            <Route path="/login" element={<AdminLogin />} />
            <Route element={<ProtectedRoute allow={ADMIN_ROLES} loginPath="/login"><AdminLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/merchants" element={<Merchants />} />
              <Route path="/merchant-applications" element={<MerchantApplications />} />
              <Route path="/company-verifications" element={<CompanyVerifications />} />
              <Route path="/riders" element={<Riders />} />
              <Route path="/riders/:id" element={<RiderDetail />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/inventory-overview" element={<InventoryOverview />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/settlements" element={<Settlements />} />
              <Route path="/commissions" element={<Commissions />} />
              <Route path="/banners" element={<Banners />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/support-tickets" element={<SupportTickets />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/admins" element={<Admins />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* ===== USER (BUYER) ===== */}
            <Route path="/user/login" element={<UserLogin />} />
            <Route path="/user/register" element={<UserRegister />} />
            <Route element={<ProtectedRoute allow={CUSTOMER_ROLES} loginPath="/user/login"><UserLayout /></ProtectedRoute>}>
              <Route path="/user" element={<Navigate to="/user/home" replace />} />
              <Route path="/user/home" element={<UserHome />} />
              <Route path="/user/products" element={<UserProducts />} />
              <Route path="/user/merchants" element={<UserMerchants />} />
              <Route path="/user/merchant/:id" element={<UserMerchantDetail />} />
              <Route path="/user/product/:id" element={<UserProductDetail />} />
              <Route path="/user/cart" element={<UserCart />} />
              <Route path="/user/checkout" element={<UserCheckout />} />
              <Route path="/user/orders" element={<UserOrders />} />
              <Route path="/user/orders/:id" element={<UserOrderDetail />} />
              <Route path="/user/payment/:id" element={<UserPayment />} />
              <Route path="/user/tracking/:orderId" element={<UserOrderDetail />} />
              <Route path="/user/refund" element={<UserRefund />} />
              <Route path="/user/profile" element={<UserProfile />} />
              <Route path="/user/addresses" element={<UserAddresses />} />
              <Route path="/user/support" element={<UserSupport />} />
              <Route path="/user/notifications" element={<UserNotifications />} />
              <Route path="/user/apply-merchant" element={<UserApplyMerchant />} />
              <Route path="/user/company-verification" element={<UserCompanyVerification />} />
            </Route>

            {/* ===== MERCHANT MANAGER ===== */}
            <Route path="/merchant/login" element={<MerchantLogin />} />
            <Route element={<ProtectedRoute allow={MERCHANT_MANAGER_ROLES} loginPath="/merchant/login"><MerchantLayout /></ProtectedRoute>}>
              <Route path="/merchant" element={<Navigate to="/merchant/dashboard" replace />} />
              <Route path="/merchant/dashboard" element={<MerchantDashboard />} />
              <Route path="/merchant/orders" element={<MerchantOrders />} />
              <Route path="/merchant/orders/:id" element={<MerchantOrderDetail />} />
              <Route path="/merchant/products" element={<MerchantProducts />} />
              <Route path="/merchant/products/new" element={<MerchantProductForm />} />
              <Route path="/merchant/products/:id/edit" element={<MerchantProductForm />} />
              <Route path="/merchant/inventory" element={<MerchantInventory />} />
              <Route path="/merchant/inventory-movements" element={<MerchantInventoryMovements />} />
              <Route path="/merchant/riders" element={<MerchantRiders />} />
              <Route path="/merchant/staff" element={<MerchantStaff />} />
              <Route path="/merchant/settlements" element={<MerchantSettlements />} />
              <Route path="/merchant/refunds" element={<MerchantRefunds />} />
              <Route path="/merchant/reports" element={<MerchantReports />} />
              <Route path="/merchant/profile" element={<MerchantProfile />} />
              <Route path="/merchant/settings" element={<MerchantSettings />} />
              <Route path="/merchant/notifications" element={<MerchantNotifications />} />
              <Route path="/merchant/support" element={<MerchantSupport />} />
            </Route>

            {/* ===== RIDER ===== */}
            <Route element={<ProtectedRoute allow={RIDER_ROLES} loginPath="/merchant/login"><RiderLayout /></ProtectedRoute>}>
              <Route path="/merchant/rider-dashboard" element={<RiderDashboard />} />
              <Route path="/merchant/rider/jobs" element={<RiderJobs />} />
              <Route path="/merchant/rider/jobs/:id" element={<RiderJobDetail />} />
              <Route path="/merchant/rider/active-delivery" element={<RiderActive />} />
              <Route path="/merchant/rider/history" element={<RiderHistory />} />
              <Route path="/merchant/rider/earnings" element={<RiderEarnings />} />
              <Route path="/merchant/rider/profile" element={<RiderProfile />} />
              <Route path="/merchant/rider/notifications" element={<RiderNotifications />} />
              <Route path="/merchant/rider/refund-pickups" element={<RiderRefundPickups />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
