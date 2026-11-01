import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Tag,
} from "lucide-react";
import { getExpenses, saveExpense, deleteExpense } from "@/services/dataService";
import { formatUzs, EXPENSE_CATEGORIES } from "@/lib/costCalculation";
import { newId, todayLocal } from "@/lib/utils";
import type { ExpenseItem, ExpenseCategory } from "@/types";

export function ExpensesPage() {
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>("metpisok");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => todayLocal());
  const [note, setNote] = useState("");
  const [isPerBatch, setIsPerBatch] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getExpenses();
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xarajatlarni yuklashda xatolik.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExpenses();
  }, [loadExpenses]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const value = Number(amount);

    if (!Number.isSafeInteger(value) || value <= 0) {
      setError("Xarajat summasi musbat butun so‘m bo‘lishi kerak.");
      return;
    }

    if (!date) {
      setError("Sanani tanlang.");
      return;
    }

    // Today's expense keeps the real time; a past/future date is stored at local noon
    // (noon avoids the date shifting across time zones).
    const parsedNoon = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsedNoon.getTime())) {
      setError("Sana noto‘g‘ri kiritilgan.");
      return;
    }
    const createdAt =
      date === todayLocal()
        ? new Date().toISOString()
        : parsedNoon.toISOString();

    const item: ExpenseItem = {
      id: newId(),
      category,
      categoryName: EXPENSE_CATEGORIES[category]?.name || category,
      amount: value,
      note: note.trim(),
      isPerBatch,
      createdAt,
    };

    try {
      await saveExpense(item);
      setAmount("");
      setNote("");
      setDate(todayLocal());
      setError("");
      setSuccess("Xarajat muvaffaqiyatli saqlandi.");
      setShowForm(false);
      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xarajatni saqlashda xatolik.",
      );
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Haqiqatan ham bu xarajatni o‘chirmoqchimisiz?")) {
      return;
    }

    try {
      setError("");
      await deleteExpense(id);
      setSuccess("Xarajat o‘chirildi.");
      await loadExpenses();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Xarajatni o‘chirishda xatolik.",
      );
    }
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  // Category breakdown calculation
  const categoryTotals: Record<ExpenseCategory, number> = {
    metpisok: 0,
    sement: 0,
    elektr: 0,
    ishchi_haqi: 0,
    ovqat_puli: 0,
    kutilmagan: 0,
    fundament: 0,
  };

  items.forEach((item) => {
    if (categoryTotals[item.category] !== undefined) {
      categoryTotals[item.category] += item.amount;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Xarajatlar
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Xomashyo, ish haqi, elektr va boshqa ishlab chiqarish xarajatlari
            nazorati
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors shadow-sm shadow-accent-500/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Yopish" : "Yangi xarajat"}
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl border border-accent-500/30 bg-accent-500/10 text-accent-500 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Overview Stat Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1 glass-panel p-6 rounded-xl border border-border-light flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Xarajatlar
            </span>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-bold text-text-primary tracking-tight">
              {formatUzs(total)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Jami qayd etilgan {items.length} ta xarajat yozuvi
            </p>
          </div>
        </div>

        {/* Categories Quick Pill Overview */}
        <div className="md:col-span-2 glass-panel p-6 rounded-xl border border-border-light">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Kategoriyalar Bo‘yicha Taqsimot
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {Object.entries(EXPENSE_CATEGORIES).map(([key, cat]) => {
              const catAmount = categoryTotals[key as ExpenseCategory] || 0;
              const percent = total > 0 ? Math.round((catAmount / total) * 100) : 0;
              return (
                <div
                  key={key}
                  className="p-2.5 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border-light/40"
                >
                  <p className="text-[11px] text-text-secondary truncate font-medium">
                    {cat.name}
                  </p>
                  <p className="text-sm font-bold text-text-primary mt-0.5">
                    {formatUzs(catAmount)}
                  </p>
                  <p className="text-[10px] text-accent-500 font-medium">
                    {percent}% ulush
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Expense Form */}
      {showForm && (
        <form
          onSubmit={submit}
          className="glass-panel p-6 rounded-xl border border-accent-500/30 bg-dark-900 shadow-xl space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Tag className="w-4 h-4 text-accent-500" />
              Yangi xarajat kiritish
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block text-xs font-medium text-text-secondary">
              Xarajat toifasi (Kategoriya)
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              >
                {Object.entries(EXPENSE_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key} className="bg-dark-950 text-text-primary">
                    {value.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Sana
              <div className="relative mt-1.5">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
                />
              </div>
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Summa (UZS)
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Masalan: 500000"
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <label className="sm:col-span-2 block text-xs font-medium text-text-secondary">
              Qo‘shimcha izoh (ixtiyoriy)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
                placeholder="Masalan: 5 tonna sement xaridi yoki avans to‘lovi"
              />
            </label>

            <div className="sm:col-span-1 pt-4">
              <label className="flex items-center gap-3 text-xs text-text-secondary cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPerBatch}
                  onChange={(e) => setIsPerBatch(e.target.checked)}
                  className="w-4 h-4 rounded border-border-light text-accent-500 focus:ring-accent-500 bg-dark-950 cursor-pointer"
                />
                <span>Butun partiyaga tegishli xarajat</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm transition-colors shadow-sm shadow-accent-500/20"
            >
              Xarajatni saqlash
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2.5 rounded-lg border border-border-light text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors"
            >
              Bekor qilish
            </button>
          </div>
        </form>
      )}

      {/* Expenses History Table */}
      <div className="glass-panel rounded-xl border border-border-light overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">
              Xarajatlar tarixi
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Barcha qayd etilgan moddiy va nomoddiy xarajatlar ro‘yxati
            </p>
          </div>
          <span className="text-xs text-text-secondary">
            Jami: {items.length} ta yozuv
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Yuklanmoqda...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Hozircha birorta xarajat kiritilmagan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-white/[0.02] text-text-secondary text-xs uppercase">
                <tr>
                  <th className="p-4">Sana</th>
                  <th className="p-4">Xarajat turi</th>
                  <th className="p-4">Summa</th>
                  <th className="p-4">Turi</th>
                  <th className="p-4">Izoh</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/40">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-text-secondary text-xs">
                      {new Date(item.createdAt).toLocaleDateString("uz-UZ", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </td>
                    <td className="p-4 font-medium text-text-primary">
                      {item.categoryName}
                    </td>
                    <td className="p-4 font-bold text-rose-400">
                      {formatUzs(item.amount)}
                    </td>
                    <td className="p-4 text-xs text-text-secondary">
                      {item.isPerBatch ? (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          Partiya xarajati
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Dona bo‘yicha
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-text-secondary text-xs">
                      {item.note || "—"}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => void remove(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
