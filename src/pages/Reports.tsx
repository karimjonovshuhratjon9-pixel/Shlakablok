import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Factory,
  CreditCard,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  getExpenses,
  getProductionBatches,
  getSales,
} from "@/services/dataService";
import type { SaleItem } from "@/lib/db";
import { isoToLocalDate } from "@/lib/utils";
import { formatUzs } from "@/lib/costCalculation";
import { DailyReportCard } from "@/components/DailyReportCard";
import type { ExpenseItem, ProductionBatch } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export function ReportsPage() {
  const { isDark } = useTheme();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [expData, batchData, saleData] = await Promise.all([
        getExpenses(),
        getProductionBatches(),
        getSales(),
      ]);
      setExpenses(expData);
      setBatches(batchData);
      setSales(saleData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Hisobot ma’lumotlarini yuklashda xatolik.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Calculations
  const totalProducedBlocks = batches.reduce(
    (sum, b) => sum + b.quantity,
    0,
  );
  const totalSoldBlocks = sales.reduce((sum, s) => sum + s.quantity, 0);
  const remainingStock = Math.max(0, totalProducedBlocks - totalSoldBlocks);

  // Revenue & Payments
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalPaid = sales.reduce((sum, s) => sum + s.paid, 0);
  const totalCustomerDebt = Math.max(0, totalRevenue - totalPaid);

  // Production Cost & Unit Cost
  const totalProductionCost = batches.reduce(
    (sum, b) => sum + b.totalCost,
    0,
  );
  const avgCostPerBlock =
    totalProducedBlocks > 0
      ? Math.round(totalProductionCost / totalProducedBlocks)
      : 0;

  // General & direct Expenses recorded in Expenses module
  const totalRecordedExpenses = expenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  // Cost of Goods Sold (Tannarx - sotilgan bloklarga to‘g‘ri keladigan ishlab chiqarish xarajati)
  const costOfGoodsSold = totalSoldBlocks * avgCostPerBlock;

  // Gross Profit = Revenue - Cost of Goods Sold
  const grossProfit = totalRevenue - costOfGoodsSold;

  // Production batch cost is usually built FROM the recorded expenses, so
  // subtracting both would count every expense twice. Only the part of the
  // recorded expenses that is NOT yet covered by production batch costs
  // (e.g. overhead that was never put into a batch) is deducted extra.
  const uncoveredExpenses = Math.max(
    0,
    totalRecordedExpenses - totalProductionCost,
  );
  const netProfit = grossProfit - uncoveredExpenses;

  // Monthly breakdown for charts
  const monthlyDataMap: Record<
    string,
    { month: string; tushum: number; xarajat: number; foyda: number }
  > = {};

  // Process sales by month
  sales.forEach((s) => {
    const monthKey = s.date.slice(0, 7); // YYYY-MM
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = {
        month: monthKey,
        tushum: 0,
        xarajat: 0,
        foyda: 0,
      };
    }
    monthlyDataMap[monthKey].tushum += s.total;
  });

  // Process batches & expenses by month
  const batchCostByMonth: Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};

  batches.forEach((b) => {
    const monthKey = b.date.slice(0, 7);
    batchCostByMonth[monthKey] = (batchCostByMonth[monthKey] || 0) + b.totalCost;
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = {
        month: monthKey,
        tushum: 0,
        xarajat: 0,
        foyda: 0,
      };
    }
  });

  expenses.forEach((e) => {
    const monthKey = isoToLocalDate(e.createdAt).slice(0, 7);
    expenseByMonth[monthKey] = (expenseByMonth[monthKey] || 0) + e.amount;
    if (!monthlyDataMap[monthKey]) {
      monthlyDataMap[monthKey] = {
        month: monthKey,
        tushum: 0,
        xarajat: 0,
        foyda: 0,
      };
    }
  });

  // Monthly cost = the larger of "batch production cost" and "recorded expenses"
  // for that month, so the same money is never counted twice.
  Object.keys(monthlyDataMap).forEach((monthKey) => {
    monthlyDataMap[monthKey].xarajat = Math.max(
      batchCostByMonth[monthKey] || 0,
      expenseByMonth[monthKey] || 0,
    );
  });

  const chartData = Object.values(monthlyDataMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map((item) => ({
      ...item,
      foyda: item.tushum - item.xarajat,
    }));

  // Expense categories breakdown for Pie Chart
  const expenseCatMap: Record<string, number> = {};
  expenses.forEach((e) => {
    expenseCatMap[e.categoryName] =
      (expenseCatMap[e.categoryName] || 0) + e.amount;
  });
  const pieData = Object.entries(expenseCatMap).map(([name, value]) => ({
    name,
    value,
  }));

  const PIE_COLORS = [
    "#10B981",
    "#3B82F6",
    "#F59E0B",
    "#EC4899",
    "#8B5CF6",
    "#14B8A6",
    "#F97316",
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary text-sm">
            Hisobot ma’lumotlari hisoblanmoqda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Moliyaviy va Ombor Hisobotlari
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Korxonaning barcha tushumlari, xarajatlari, foydasi va ombor qoldig‘i
            tahlili
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-border-light text-text-primary hover:bg-white/10 text-sm font-medium transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4 text-accent-500" />
          Chop etish / Eksport
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kunlik hisobot */}
      <DailyReportCard />

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Revenue */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Savdo (Tushum)
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {formatUzs(totalRevenue)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Amalda tushgan:{" "}
              <span className="text-emerald-400 font-medium">
                {formatUzs(totalPaid)}
              </span>
            </p>
          </div>
        </div>

        {/* Expenses */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Xarajatlar
            </span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {formatUzs(totalProductionCost + totalRecordedExpenses)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Ishlab chiqarish + qayd etilgan xarajatlar
            </p>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Yalpi Foyda (Gross Profit)
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3
              className={`text-2xl font-bold tracking-tight ${
                grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {formatUzs(grossProfit)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Savdo - Sotilgan mahsulot tannarxi
            </p>
          </div>
        </div>

        {/* Net Profit */}
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Sof Foyda (Net Profit)
            </span>
            <div
              className={`p-2 rounded-lg ${
                netProfit >= 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-500/10 text-rose-400"
              }`}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="mt-4">
            <h3
              className={`text-2xl font-bold tracking-tight ${
                netProfit >= 0 ? "text-accent-500" : "text-rose-400"
              }`}
            >
              {formatUzs(netProfit)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Barcha xarajatlar chiqarilgandan so‘ng
            </p>
          </div>
        </div>
      </div>

      {/* Production & Inventory Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Produced blocks */}
        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary uppercase font-semibold">
              Ishlab Chiqarilgan
            </span>
            <Factory className="w-5 h-5 text-accent-500" />
          </div>
          <p className="text-2xl font-bold text-text-primary mt-3">
            {totalProducedBlocks.toLocaleString("uz-UZ")}{" "}
            <span className="text-sm font-normal text-text-secondary">
              dona
            </span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            O‘rtacha tannarx: {formatUzs(avgCostPerBlock)}/dona
          </p>
        </div>

        {/* Sold blocks */}
        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary uppercase font-semibold">
              Sotilgan Bloklar
            </span>
            <ShoppingCart className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary mt-3">
            {totalSoldBlocks.toLocaleString("uz-UZ")}{" "}
            <span className="text-sm font-normal text-text-secondary">
              dona
            </span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Jami {sales.length} ta sotuv amalga oshirilgan
          </p>
        </div>

        {/* Remaining stock */}
        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary uppercase font-semibold">
              Qoldiq Ombor
            </span>
            <Package className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary mt-3">
            {remainingStock.toLocaleString("uz-UZ")}{" "}
            <span className="text-sm font-normal text-text-secondary">
              dona
            </span>
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            Ombordagi qiymati: {formatUzs(remainingStock * avgCostPerBlock)}
          </p>
        </div>

        {/* Customer debts */}
        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary uppercase font-semibold">
              Mijozlar Qarzi (Nasiya)
            </span>
            <AlertCircle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-3">
            {formatUzs(totalCustomerDebt)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Undirilishi kutilayotgan mablag‘
          </p>
        </div>
      </div>

      {/* Visual Analytics / Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Financial Trend Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-border-light">
          <h3 className="text-base font-semibold text-text-primary mb-4">
            Oylik Moliyaviy Ko‘rsatkichlar Dinamikasi
          </h3>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              Grafik tuzish uchun kamida bitta operatsiya kiriting.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#26332C" : "#E2E8F0"}
                  />
                  <XAxis
                    dataKey="month"
                    stroke={isDark ? "#9CA3AF" : "#64748B"}
                    fontSize={12}
                  />
                  <YAxis
                    stroke={isDark ? "#9CA3AF" : "#64748B"}
                    fontSize={11}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#151A18" : "#FFFFFF",
                      borderColor: isDark ? "#334038" : "#E2E8F0",
                      color: isDark ? "#fff" : "#0F172A",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(val: number) => formatUzs(val)}
                  />
                  <Legend />
                  <Bar
                    dataKey="tushum"
                    name="Tushum"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="xarajat"
                    name="Xarajat"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expenses Category Pie Chart */}
        <div className="glass-panel p-6 rounded-xl border border-border-light flex flex-col justify-between">
          <h3 className="text-base font-semibold text-text-primary mb-2">
            Xarajatlar Tuzilishi (Kategoriyalar bo‘yicha)
          </h3>
          {pieData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-text-muted text-sm">
              Xarajatlar kiritilmagan.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#151A18" : "#FFFFFF",
                      borderColor: isDark ? "#334038" : "#E2E8F0",
                      color: isDark ? "#fff" : "#0F172A",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(val: number) => formatUzs(val)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="pt-3 border-t border-border-light text-xs text-text-secondary flex justify-between">
            <span>Kategoriyalar soni: {pieData.length} ta</span>
            <span className="text-accent-500 font-semibold">
              Jami: {formatUzs(totalRecordedExpenses)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Financial Summary Table */}
      <div className="glass-panel rounded-xl border border-border-light overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">
            Moliyaviy Xulosa Jadvali
          </h3>
          <span className="text-xs text-accent-500 font-medium bg-accent-500/10 px-2.5 py-1 rounded-full border border-accent-500/20">
            Jonli hisob-kitob
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] text-text-secondary">
              <tr>
                <th className="p-4">Ko‘rsatkich nomi</th>
                <th className="p-4">Miqdor / Qiymat</th>
                <th className="p-4">Tushuntirish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light/40 text-text-primary">
              <tr>
                <td className="p-4 font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Jami Sotuv Daromadi (Revenue)
                </td>
                <td className="p-4 font-bold text-emerald-400">
                  {formatUzs(totalRevenue)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Barcha rasmiylashtirilgan sotuvlar summasi
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Haqiqatda Qabul Qilingan To‘lovlar
                </td>
                <td className="p-4 font-bold text-text-primary">
                  {formatUzs(totalPaid)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Kassaga kelib tushgan naqd va o‘tkazma pullar
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Mijozlar Qarzdorligi (Nasiya)
                </td>
                <td className="p-4 font-bold text-amber-400">
                  {formatUzs(totalCustomerDebt)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Mijozlar tomonidan hali to‘lanmagan qarzlar
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium flex items-center gap-2">
                  <Factory className="w-4 h-4 text-blue-400" />
                  Ishlab Chiqarish Xarajatlari
                </td>
                <td className="p-4 font-bold text-text-primary">
                  {formatUzs(totalProductionCost)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Partiyalar bo‘yicha hisoblangan jami tannarx
                </td>
              </tr>
              <tr>
                <td className="p-4 font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-rose-400" />
                  Qo‘shimcha Qayd Etilgan Xarajatlar
                </td>
                <td className="p-4 font-bold text-rose-400">
                  {formatUzs(totalRecordedExpenses)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Xomashyo, ish haqi, elektr va boshqa xarajatlar
                </td>
              </tr>
              <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                <td className="p-4 font-semibold text-text-primary flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-500" />
                  Yalpi Foyda (Gross Profit)
                </td>
                <td
                  className={`p-4 font-bold ${
                    grossProfit >= 0 ? "text-accent-500" : "text-rose-400"
                  }`}
                >
                  {formatUzs(grossProfit)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Sotuv summasidan sotilgan mahsulot tannarxi ayrilgandagi foyda
                </td>
              </tr>
              <tr className="bg-accent-500/5">
                <td className="p-4 font-bold text-accent-500 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent-500" />
                  Sof Foyda (Net Profit)
                </td>
                <td
                  className={`p-4 font-bold text-lg ${
                    netProfit >= 0 ? "text-accent-500" : "text-rose-400"
                  }`}
                >
                  {formatUzs(netProfit)}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  Barcha sarf-xarajatlar to‘liq qoplangandan keyingi sof daromad
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

