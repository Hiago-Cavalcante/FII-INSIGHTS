import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.token !== null);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}
