import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Factory,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { newId, todayLocal } from "@/lib/utils";
import type { ProductionBatch, ExpenseItem } from "@/types";
import { formatUzs, calculateCostPerBlock } from "@/lib/costCalculation";
import {
  saveProductionBatch,
  getProductionBatches,
  deleteProductionBatch,
  getExpenses,
} from "@/services/dataService";

const today = todayLocal;

const emptyForm = {
  date: today(),
  quantity: "",
  costPerBlock: "",
  note: "",
};

export function ProductionPage() {
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [batchData, expData] = await Promise.all([
        getProductionBatches(),
        getExpenses(),
      ]);
      setBatches(batchData);
      setExpenses(expData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ma’lumotlarni yuklashda xatolik",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openNewForm() {
    setEditingId(null);
    setFormData({ ...emptyForm, date: today() });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(batch: ProductionBatch) {
    setEditingId(batch.id);
    setFormData({
      date: batch.date,
      quantity: String(batch.quantity),
      costPerBlock: String(batch.costPerBlock),
      note: batch.note || "",
    });
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  // Auto-calculate unit cost from current expenses
  function handleCalculateFromExpenses() {
    const qty = Number(formData.quantity);
    if (!Number.isSafeInteger(qty) || qty <= 0) {
      setError("Xarajatlardan tannarxni hisoblash uchun avval blok sonini kiriting.");
      return;
    }

    if (expenses.length === 0) {
      setError("Tizimda xarajatlar topilmadi. Avval Xarajatlar bo‘limiga xarajatlarni kiriting.");
      return;
    }

    // Only expenses recorded since the previous batch belong to this batch.
    // (Using all expenses ever recorded would charge old expenses again to every new batch.)
    const target = editingId
      ? batches.find((item) => item.id === editingId)
      : undefined;
    const targetTime = target ? new Date(target.createdAt).getTime() : Infinity;
    const previousTime = batches
      .filter(
        (item) =>
          item.id !== editingId &&
          new Date(item.createdAt).getTime() < targetTime,
      )
      .reduce(
        (latest, item) => Math.max(latest, new Date(item.createdAt).getTime()),
        -Infinity,
      );

    const relevant = expenses.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t > previousTime && t <= targetTime;
    });

    if (relevant.length === 0) {
      setError(
        "Oxirgi partiyadan keyin yangi xarajat kiritilmagan. Avval Xarajatlar bo‘limiga xarajat qo‘shing yoki tannarxni qo‘lda kiriting.",
      );
      return;
    }

    const calcResult = calculateCostPerBlock(relevant, qty);
    setFormData((prev) => ({
      ...prev,
      costPerBlock: String(Math.round(calcResult.costPerBlock)),
    }));
    setError("");
    setSuccess(
      `Oxirgi partiyadan keyingi ${relevant.length} ta xarajat asosida hisoblandi: ${formatUzs(calcResult.costPerBlock)}/dona (jami ${formatUzs(calcResult.totalCost)})`,
    );
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const quantity = Number(formData.quantity);
    const costPerBlock = Number(formData.costPerBlock);

    if (!formData.date) {
      setError("Sanani kiriting.");
      return;
    }

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      setError("Blok soni musbat butun son bo‘lishi kerak.");
      return;
    }

    if (!Number.isSafeInteger(costPerBlock) || costPerBlock < 0) {
      setError("Bir dona blok tannarxini to‘g‘ri kiriting.");
      return;
    }

    const totalCost = quantity * costPerBlock;

    if (!Number.isSafeInteger(totalCost)) {
      setError("Umumiy xarajat miqdori juda katta.");
      return;
    }

    setIsSaving(true);

    try {
      const existing = editingId
        ? batches.find((item) => item.id === editingId)
        : undefined;

      const batch: ProductionBatch = {
        id: editingId || newId(),
        date: formData.date,
        quantity,
        costPerBlock,
        totalCost,
        note: formData.note.trim(),
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      await saveProductionBatch(batch);
      await loadData();

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyForm);
      setSuccess(
        editingId
          ? "Partiya muvaffaqiyatli yangilandi."
          : "Yangi ishlab chiqarish partiyasi saqlandi.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (
      !window.confirm("Haqiqatan ham ushbu ishlab chiqarish partiyasini o‘chirmoqchimisiz?")
    ) {
      return;
    }

    try {
      setError("");
      await deleteProductionBatch(id);
      await loadData();
      setSuccess("Partiya o‘chirildi.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Partiyani o‘chirishda xatolik yuz berdi.",
      );
    }
  }

  const totalBlocks = batches.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = batches.reduce((sum, item) => sum + item.totalCost, 0);
  const avgCost = totalBlocks > 0 ? Math.round(totalCost / totalBlocks) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Ishlab chiqarish
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Ishlab chiqarish partiyalari, bloklar hisobi va tannarx nazorati
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors shadow-sm shadow-accent-500/20"
        >
          <Plus className="w-4 h-4" />
          Yangi partiya
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Ishlab Chiqarilgan
            </span>
            <Factory className="w-5 h-5 text-accent-500" />
          </div>
          <p className="text-2xl font-bold text-text-primary mt-3">
            {totalBlocks.toLocaleString("uz-UZ")}{" "}
            <span className="text-sm font-normal text-text-secondary">dona</span>
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {batches.length} ta partiyada tayyorlangan
          </p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Ishlab Chiqarish Xarajati
            </span>
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-3">
            {formatUzs(totalCost)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Barcha partiyalar tannarxi
          </p>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-border-light">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              O‘rtacha Tannarx
            </span>
            <Calculator className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-text-primary mt-3">
            {formatUzs(avgCost)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Bir dona blok o‘rtacha tannarxi
          </p>
        </div>
      </div>

      {/* Production Form Modal / Accordion */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="glass-panel p-6 rounded-xl border border-accent-500/30 bg-dark-900 shadow-xl space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Factory className="w-4 h-4 text-accent-500" />
              {editingId ? "Partiyani tahrirlash" : "Yangi ishlab chiqarish partiyasi"}
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
              Ishlab chiqarilgan sana
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Blok soni (dona)
              <input
                type="number"
                min="1"
                step="1"
                required
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder="Masalan: 1000"
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-secondary">
                  Bir dona blok tannarxi (UZS)
                </label>
                <button
                  type="button"
                  onClick={handleCalculateFromExpenses}
                  className="text-[11px] text-accent-500 hover:text-accent-400 font-medium inline-flex items-center gap-1"
                  title="Xarajatlar bo‘limidagi yozuvlar bo‘yicha avtomatik hisoblash"
                >
                  <Calculator className="w-3 h-3" />
                  Xarajatlardan hisoblash
                </button>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={formData.costPerBlock}
                onChange={(e) =>
                  setFormData({ ...formData, costPerBlock: e.target.value })
                }
                placeholder="Masalan: 2500"
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </div>
          </div>

          <label className="block text-xs font-medium text-text-secondary">
            Izoh (ixtiyoriy)
            <input
              type="text"
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="Sifat, ishchilar smenasi yoki xomashyo haqida qo‘shimcha eslatma"
              className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
            />
          </label>

          <div className="rounded-lg bg-accent-500/10 border border-accent-500/20 p-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-text-secondary">Ushbu partiyaning jami tannarxi:</p>
              <p className="text-xl font-bold text-accent-500 mt-0.5">
                {formatUzs(
                  (Number(formData.quantity) || 0) *
                    (Number(formData.costPerBlock) || 0),
                )}
              </p>
            </div>
            <p className="text-xs text-text-secondary max-w-xs">
              Bu summa hisobotlarda sotilgan bloklar tannarxini hisoblashda ishlatiladi.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm transition-colors shadow-sm shadow-accent-500/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saqlanmoqda..." : "Saqlash"}
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

      {/* Batches Table */}
      <div className="glass-panel rounded-xl border border-border-light overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">
              Ishlab chiqarish tarixi
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Barcha partiyalar, ishlab chiqarish hajmi va tannarx qaydlari
            </p>
          </div>
          <span className="text-xs text-text-secondary">
            Jami: {batches.length} ta partiya
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Yuklanmoqda...
          </div>
        ) : batches.length === 0 ? (
          <div className="py-12 text-center">
            <Factory className="mx-auto mb-3 text-text-secondary" size={36} />
            <p className="font-medium text-text-primary">Hozircha partiyalar yo‘q</p>
            <p className="mt-1 text-xs text-text-secondary">
              Birinchi ishlab chiqarish partiyasini qo‘shing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white/[0.02] text-text-secondary text-xs uppercase">
                <tr>
                  <th className="p-4">Sana</th>
                  <th className="p-4">Blok soni</th>
                  <th className="p-4">Bir dona tannarx</th>
                  <th className="p-4">Jami tannarx</th>
                  <th className="p-4">Izoh</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/40">
                {batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-text-secondary text-xs font-medium">
                      {batch.date}
                    </td>
                    <td className="p-4 font-bold text-text-primary">
                      {batch.quantity.toLocaleString("uz-UZ")} dona
                    </td>
                    <td className="p-4 text-text-primary">
                      {formatUzs(batch.costPerBlock)}
                    </td>
                    <td className="p-4 font-semibold text-accent-500">
                      {formatUzs(batch.totalCost)}
                    </td>
                    <td className="p-4 text-text-secondary text-xs">
                      {batch.note || "—"}
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(batch)}
                          title="Tahrirlash"
                          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(batch.id)}
                          title="O‘chirish"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
