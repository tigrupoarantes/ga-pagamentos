import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Solicitacoes from "./pages/Solicitacoes";
import Aprovacoes from "./pages/Aprovacoes";
import CentrosCusto from "./pages/admin/CentrosCusto";
import Fornecedores from "./pages/admin/Fornecedores";
import OrcamentoAnual from "./pages/admin/OrcamentoAnual";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/aprovacoes" element={<Aprovacoes />} />
            <Route path="/admin/centros-custo" element={<CentrosCusto />} />
            <Route path="/admin/fornecedores" element={<Fornecedores />} />
            <Route path="/admin/orcamento" element={<OrcamentoAnual />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
