import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Factory,
  ShoppingCart,
  DollarSign,
  Package,
  AlertCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { formatUzs } from "@/lib/costCalculation";
import { DailyReportCard } from "@/components/DailyReportCard";
import { isoToLocalDate } from "@/lib/utils";
import {
  getExpenses,
  getProductionBatches,
  getSales,
} from "@/services/dataService";
import type { SaleItem } from "@/lib/db";
import type { ExpenseItem, ProductionBatch, AppPage } from "@/types";

interface DashboardPageProps {
  onNavigate?: (page: AppPage) => void;
}

interface RecentActivity {
  id: string;
  date: string;
  type: "production" | "sale" | "expense";
  typeName: string;
  quantity?: number;
  amount: number;
  note?: string;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [batchData, saleData, expData] = await Promise.all([
        getProductionBatches(),
        getSales(),
        getExpenses(),
      ]);
      setBatches(batchData);
      setSales(saleData);
      setExpenses(expData);
    } catch (err) {
      console.error("Dashboard ma’lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Aggregate numbers
  const totalProduced = batches.reduce((sum, b) => sum + b.quantity, 0);
  const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
  const availableStock = Math.max(0, totalProduced - totalSold);

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.paid, 0);
  const totalDebt = Math.max(0, totalRevenue - totalPaid);

  const totalProductionCost = batches.reduce((sum, b) => sum + b.totalCost, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const avgCostPerBlock =
    totalProduced > 0 ? Math.round(totalProductionCost / totalProduced) : 0;

  // Build combined recent activities
  const recentActivities: RecentActivity[] = [];

  batches.slice(0, 5).forEach((b) => {
    recentActivities.push({
      id: b.id,
      date: b.date,
      type: "production",
      typeName: "Ishlab chiqarish",
      quantity: b.quantity,
      amount: b.totalCost,
      note: b.note,
    });
  });

  sales.slice(0, 5).forEach((s) => {
    recentActivities.push({
      id: s.id,
      date: s.date,
      type: "sale",
      typeName: `Sotuv (${s.customer})`,
      quantity: s.quantity,
      amount: s.total,
    });
  });

  expenses.slice(0, 5).forEach((e) => {
    recentActivities.push({
      id: e.id,
      date: isoToLocalDate(e.createdAt),
      type: "expense",
      typeName: `Xarajat: ${e.categoryName}`,
      amount: e.amount,
      note: e.note,
    });
  });

  recentActivities.sort((a, b) => b.date.localeCompare(a.date));
  const latestActivities = recentActivities.slice(0, 6);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary text-sm">
            Boshqaruv paneli yuklanmoqda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight">
            Boshqaruv paneli
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Shlakablok ishlab chiqarish va sotuv hisob-kitoblari monitoringi
          </p>
        </div>

        {onNavigate && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate("production")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs md:text-sm font-medium transition-colors shadow-sm shadow-accent-500/20"
            >
              <Plus className="w-4 h-4" />
              Yangi partiya
            </button>
            <button
              onClick={() => onNavigate("sales")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-text-primary text-xs md:text-sm font-medium border border-border-light transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Yangi sotuv
            </button>
            <button
              onClick={() => onNavigate("expenses")}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 text-text-primary text-xs md:text-sm font-medium border border-border-light transition-colors"
            >
              <CreditCard className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              Yangi xarajat
            </button>
          </div>
        )}
      </div>

      {/* Kunlik hisobot */}
      <DailyReportCard />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Ombor qoldig'i */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Ombordagi Qoldiq
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {availableStock.toLocaleString("uz-UZ")}{" "}
              <span className="text-sm font-normal text-text-secondary">
                dona
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Jami ishlab chiqarilgan: {totalProduced.toLocaleString("uz-UZ")}{" "}
              dona
            </p>
          </div>
        </div>

        {/* Jami tushum */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Savdo Tushumi
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {formatUzs(totalRevenue)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              To‘langan:{" "}
              <span className="text-emerald-400 font-medium">
                {formatUzs(totalPaid)}
              </span>
            </p>
          </div>
        </div>

        {/* Tannarx */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              O‘rtacha Tannarx
            </span>
            <div className="p-2 rounded-lg bg-accent-500/10 text-accent-500">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {formatUzs(avgCostPerBlock)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Bir dona blok tannarxi
            </p>
          </div>
        </div>

        {/* Mijozlar qarzi */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Mijozlar Qarzi
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-amber-400 tracking-tight">
              {formatUzs(totalDebt)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Undirilishi kerak bo‘lgan summa
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activities + Quick Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities Table */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-border-light">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Oxirgi amallar
              </h2>
              <p className="text-xs text-text-secondary">
                So‘nggi ishlab chiqarish, sotuv va xarajat operatsiyalari
              </p>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate("reports")}
                className="text-xs text-accent-500 hover:text-accent-400 font-medium inline-flex items-center gap-1"
              >
                Barchasini ko‘rish <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-secondary border-b border-border-light pb-3 text-xs uppercase">
                  <th className="pb-3 font-medium">Sana</th>
                  <th className="pb-3 font-medium">Operatsiya</th>
                  <th className="pb-3 font-medium">Hajm / Miqdor</th>
                  <th className="pb-3 font-medium text-right">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/40">
                {latestActivities.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-text-secondary text-sm"
                    >
                      Hozircha tizimda operatsiyalar mavjud emas.
                    </td>
                  </tr>
                ) : (
                  latestActivities.map((act) => (
                    <tr
                      key={`${act.type}-${act.id}`}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 text-text-secondary text-xs">
                        {act.date}
                      </td>
                      <td className="py-3.5 text-text-primary font-medium">
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              act.type === "production"
                                ? "bg-accent-500"
                                : act.type === "sale"
                                  ? "bg-blue-400"
                                  : "bg-rose-400"
                            }`}
                          />
                          {act.typeName}
                        </span>
                      </td>
                      <td className="py-3.5 text-text-secondary text-xs">
                        {act.quantity !== undefined
                          ? `${act.quantity.toLocaleString("uz-UZ")} dona`
                          : "—"}
                      </td>
                      <td className="py-3.5 font-semibold text-right">
                        <span
                          className={
                            act.type === "sale"
                              ? "text-emerald-400"
                              : "text-text-primary"
                          }
                        >
                          {act.type === "sale" ? "+" : "-"}
                          {formatUzs(act.amount)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Summary / Status Card */}
        <div className="glass-panel p-6 rounded-xl border border-border-light flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Tezkor ko‘rsatkichlar
            </h2>
            <p className="text-xs text-text-secondary mb-5">
              Biznesingizning joriy holati
            </p>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center p-3.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-border-light/50">
                <div>
                  <p className="text-[11px] text-text-secondary uppercase font-semibold">
                    Qayd etilgan xarajatlar
                  </p>
                  <p className="text-base font-bold text-text-primary mt-0.5">
                    {formatUzs(totalExpenses)}
                  </p>
                </div>
                <CreditCard className="w-5 h-5 text-rose-400" />
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-border-light/50">
                <div>
                  <p className="text-[11px] text-text-secondary uppercase font-semibold">
                    Ishlab chiqarish xarajati
                  </p>
                  <p className="text-base font-bold text-text-primary mt-0.5">
                    {formatUzs(totalProductionCost)}
                  </p>
                </div>
                <Factory className="w-5 h-5 text-accent-500" />
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-border-light/50">
                <div>
                  <p className="text-[11px] text-text-secondary uppercase font-semibold">
                    Sotilgan mahsulot
                  </p>
                  <p className="text-base font-bold text-text-primary mt-0.5">
                    {totalSold.toLocaleString("uz-UZ")} dona
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate("reports")}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-accent-500/10 hover:bg-accent-500/20 text-accent-500 border border-accent-500/30 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              To‘liq hisobotni ochish
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
