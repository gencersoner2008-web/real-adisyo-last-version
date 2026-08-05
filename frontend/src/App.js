import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PrinterProvider } from "@/context/PrinterContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { Toaster } from "@/components/ui/sonner";
import LoginPage from "@/pages/LoginPage";
import AppShell from "@/pages/AppShell";
import TablesPage from "@/pages/TablesPage";
import OrderPage from "@/pages/OrderPage";
import ProductsPage from "@/pages/ProductsPage";
import ManageTablesPage from "@/pages/ManageTablesPage";
import ReportsPage from "@/pages/ReportsPage";
import QrOrderPage from "@/pages/QrOrderPage";

function Protected({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SettingsProvider>
        <PrinterProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/qr/:tableId" element={<QrOrderPage />} />
            <Route
              path="/"
              element={
                <Protected>
                  <AppShell />
                </Protected>
              }
            >
              <Route index element={<TablesPage />} />
              <Route path="masalar/:tableId" element={<OrderPage />} />
              <Route path="urunler" element={<ProductsPage />} />
              <Route path="masa-yonetim" element={<ManageTablesPage />} />
              <Route path="raporlar" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
        </PrinterProvider>
        </SettingsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
