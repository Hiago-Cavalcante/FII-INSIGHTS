import { Routes, Route, Outlet } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { InicioPage } from "@/pages/InicioPage";
import { CarteiraPage } from "@/pages/CarteiraPage";
import { AnalisePage } from "@/pages/AnalisePage";
import { IAPage } from "@/pages/IAPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <AppShell>
              <Outlet />
            </AppShell>
          }
        >
          <Route path="/" element={<InicioPage />} />
          <Route path="/carteira" element={<CarteiraPage />} />
          <Route path="/analise" element={<AnalisePage />} />
          <Route path="/ia" element={<IAPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return <AppRoutes />;
}
