import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { RankingPage } from "@/pages/RankingPage";
import { ClustersPage } from "@/pages/ClustersPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { CarteiraPage } from "@/pages/CarteiraPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/carteira" element={<CarteiraPage />} />
        </Route>
      </Routes>
    </Layout>
  );
}
