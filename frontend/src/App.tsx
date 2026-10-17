import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { Spinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import type { ReactNode } from "react";

import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { ProductPage } from "./pages/ProductPage";
import { BuilderPage } from "./pages/BuilderPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderPage } from "./pages/OrderPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DeliveryPage } from "./pages/DeliveryPage";

import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminProducts } from "./pages/admin/AdminProducts";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminOrders } from "./pages/admin/AdminOrders";

function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/flowers" element={<CatalogPage category="flowers" />} />
          <Route path="/bouquets" element={<CatalogPage category="bouquets" />} />
          <Route path="/plants" element={<CatalogPage category="plants" />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<RequireAuth><CartPage /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
          <Route path="/orders/:orderNumber" element={<RequireAuth><OrderPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
