import { useState } from "react";
import { DashboardPage } from "./pages/Dashboard";
import { ExpensesPage } from "./pages/Expenses";
import { ProductionPage } from "./pages/Production";
import { SalesPage } from "./pages/Sales";
import { ReportsPage } from "./pages/Reports";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LegacyMigrationBanner } from "@/components/LegacyMigrationBanner";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { AppPage } from "@/types";

function App() {
  const [activePage, setActivePage] = useState<AppPage>("dashboard");

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage onNavigate={setActivePage} />;
      case "expenses":
        return <ExpensesPage />;
      case "production":
        return <ProductionPage />;
      case "sales":
        return <SalesPage />;
      case "reports":
        return <ReportsPage />;
      default:
        return <DashboardPage onNavigate={setActivePage} />;
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 p-6">
        <div className="glass-panel max-w-md p-6 text-sm text-text-primary space-y-2">
          <h1 className="text-lg font-bold">Supabase sozlanmagan</h1>
          <p className="text-text-secondary">
            Loyiha papkasidagi <code>.env</code> faylda{" "}
            <code>VITE_SUPABASE_URL</code> va{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> qiymatlarini to‘ldiring, so‘ng
            dasturni qayta ishga tushiring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout activePage={activePage} onPageChange={setActivePage}>
      <LegacyMigrationBanner />
      {renderPage()}
    </DashboardLayout>
  );
}

export default App;
