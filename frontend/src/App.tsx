import { Routes, Route } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { DashboardPage } from "@/pages/DashboardPage";
import { RankingPage } from "@/pages/RankingPage";
import { ClustersPage } from "@/pages/ClustersPage";
import { PerfilPage } from "@/pages/PerfilPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/perfil" element={<PerfilPage />} />
      </Routes>
    </Layout>
  );
}
