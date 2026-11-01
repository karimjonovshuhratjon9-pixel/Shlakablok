import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Package,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getDailyReport, sendDailyReportToTelegram } from "@/services/dataService";
import { formatUzs } from "@/lib/costCalculation";
import { todayLocal } from "@/lib/utils";
import type { DailyReport } from "@/types";

export function DailyReportCard() {
  const [date, setDate] = useState(() => todayLocal());
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async (d: string) => {
    try {
      setLoading(true);
      setError("");
      setReport(await getDailyReport(d));
    } catch (err) {
      setReport(null);
      setError(
        err instanceof Error ? err.message : "Kunlik hisobotni yuklab bo‘lmadi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (date) void load(date);
  }, [date, load]);

  async function handleSend() {
    setSending(true);
    setError("");
    setSuccess("");
    try {
      await sendDailyReportToTelegram(date);
      setSuccess("Hisobot Telegramga yuborildi.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Telegramga yuborib bo‘lmadi.",
      );
    } finally {
      setSending(false);
    }
  }

  const profit = report?.net_profit ?? 0;

  return (
    <div className="glass-panel p-6 rounded-xl border border-border-light space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Kunlik hisobot
          </h2>
          <p className="text-xs text-text-secondary">
            Har kuni soat 21:00 da Telegram botga ham avtomatik yuboriladi
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <CalendarDays className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="date"
              value={date}
              max={todayLocal()}
              onChange={(e) => setDate(e.target.value)}
              className="pl-8 pr-3 py-2 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500"
            />
          </label>
          <button
            onClick={handleSend}
            disabled={sending || !date}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? "Yuborilmoqda..." : "Telegramga yuborish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border border-border-light/60 bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Sotilgan bloklar
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {report.sold_blocks.toLocaleString("uz-UZ")}{" "}
                <span className="text-sm font-normal text-text-secondary">
                  dona
                </span>
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {report.sales_count} ta sotuv
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border-light/60 bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Tushum
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {formatUzs(report.revenue)}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                To‘langan: {formatUzs(report.paid)}
                {report.debt > 0 && ` · Nasiya: ${formatUzs(report.debt)}`}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-border-light/60 bg-black/[0.02] dark:bg-white/[0.03]">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Xarajat
                <CreditCard className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-2">
                {formatUzs(report.expenses)}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {report.expenses_count} ta xarajat
              </p>
            </div>

            <div className="p-4 rounded-lg border border-accent-500/30 bg-accent-500/5">
              <div className="flex items-center justify-between text-xs font-semibold text-text-secondary uppercase tracking-wider">
                {profit >= 0 ? "Sof foyda" : "Zarar"}
                {profit >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <p
                className={`text-2xl font-bold mt-2 ${
                  profit >= 0 ? "text-accent-500" : "text-rose-400"
                }`}
              >
                {formatUzs(profit)}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Tushum − xarajat
              </p>
            </div>
          </div>

          {report.expense_by_category.length > 0 && (
            <div className="text-xs text-text-secondary flex flex-wrap gap-x-4 gap-y-1">
              {report.expense_by_category.map((c) => (
                <span key={c.name}>
                  {c.name}:{" "}
                  <span className="text-text-primary font-medium">
                    {formatUzs(c.amount)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
