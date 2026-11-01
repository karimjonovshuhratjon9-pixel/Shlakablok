import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Plus,
  Wallet,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Trash2,
  User,
} from "lucide-react";
import {
  createSale,
  getSales,
  getProductionBatches,
  addSalePayment,
  deleteSale,
} from "@/services/dataService";
import type { SaleItem } from "@/lib/db";
import { formatUzs } from "@/lib/costCalculation";
import { newId, todayLocal } from "@/lib/utils";

export function SalesPage() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // New Sale Form States
  const [customer, setCustomer] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [paid, setPaid] = useState("");
  const [date, setDate] = useState(() => todayLocal());

  // Payment Modal States
  const [paymentSale, setPaymentSale] = useState<SaleItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Status Alerts
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [saleRows, batches] = await Promise.all([
        getSales(),
        getProductionBatches(),
      ]);

      setSales(saleRows);

      const produced = batches.reduce((sum, batch) => sum + batch.quantity, 0);
      const sold = saleRows.reduce((sum, sale) => sum + sale.quantity, 0);

      setAvailable(Math.max(0, produced - sold));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ma’lumotlarni yuklashda xatolik yuz berdi.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPaid = sales.reduce((sum, sale) => sum + sale.paid, 0);
  const totalDebt = Math.max(0, totalRevenue - totalPaid);
  const totalSold = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const qty = Number(quantity);
    const price = Number(unitPrice);
    const initialPaid = paid.trim() === "" ? 0 : Number(paid);

    if (!customer.trim()) {
      setError("Mijoz ismini yoki tashkilot nomini kiriting.");
      return;
    }

    if (!Number.isSafeInteger(qty) || qty <= 0) {
      setError("Blok soni musbat butun son bo‘lishi kerak.");
      return;
    }

    if (qty > available) {
      setError(`Omborda yetarli blok yo‘q. Hozirda faqat ${available} dona mavjud.`);
      return;
    }

    if (!Number.isSafeInteger(price) || price <= 0) {
      setError("Blok narxi musbat butun so‘m bo‘lishi kerak.");
      return;
    }

    const total = qty * price;

    if (!Number.isSafeInteger(total)) {
      setError("Sotuv summasi juda katta.");
      return;
    }

    if (
      !Number.isSafeInteger(initialPaid) ||
      initialPaid < 0 ||
      initialPaid > total
    ) {
      setError("Boshlang‘ich to‘lov 0 dan sotuv summasigacha bo‘lishi kerak.");
      return;
    }

    if (!date) {
      setError("Sotuv sanasini tanlang.");
      return;
    }

    try {
      await createSale({
        id: newId(),
        customer: customer.trim(),
        quantity: qty,
        unitPrice: price,
        total,
        paid: initialPaid,
        date,
        createdAt: new Date().toISOString(),
      });

      setCustomer("");
      setQuantity("");
      setUnitPrice("");
      setPaid("");
      setDate(todayLocal());
      setShowForm(false);
      setSuccess("Sotuv muvaffaqiyatli saqlandi.");

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sotuvni saqlab bo‘lmadi.");
    }
  }

  function openPaymentModal(sale: SaleItem) {
    setPaymentSale(sale);
    const remaining = sale.total - sale.paid;
    setPaymentAmount(String(remaining));
    setError("");
    setSuccess("");
  }

  async function handleSavePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentSale) return;

    const remaining = paymentSale.total - paymentSale.paid;
    const amount = Number(paymentAmount);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setError("To‘lov miqdori musbat butun so‘m bo‘lishi kerak.");
      return;
    }

    if (amount > remaining) {
      setError(
        `Kiritilgan summa (${formatUzs(amount)}) qoldiq qarzdan (${formatUzs(remaining)}) oshib ketdi.`,
      );
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await addSalePayment(paymentSale.id, amount);
      setPaymentSale(null);
      setPaymentAmount("");
      setError("");
      setSuccess("To‘lov muvaffaqiyatli qabul qilindi.");
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "To‘lovni saqlashda xatolik yuz berdi.",
      );
    } finally {
      setIsSubmittingPayment(false);
    }
  }

  async function handleDeleteSale(id: string) {
    if (
      !window.confirm(
        "Haqiqatan ham ushbu sotuvni o‘chirmoqchimisiz? (Sotilgan bloklar ombor qoldig‘iga qaytariladi)",
      )
    ) {
      return;
    }

    try {
      setError("");
      await deleteSale(id);
      setSuccess("Sotuv o‘chirildi va bloklar omborga qaytarildi.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sotuvni o‘chirishda xatolik.");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">
            Savdo va Ombor
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Bloklar sotuvi, mijozlar qarzlari va real ombor qoldig‘i hisobi
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            setError("");
            setSuccess("");
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-sm font-medium transition-colors shadow-sm shadow-accent-500/20"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Yopish" : "Yangi sotuv"}
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

      {/* Inventory & Sales Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Ombordagi Blok
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {available.toLocaleString("uz-UZ")}{" "}
              <span className="text-sm font-normal text-text-secondary">
                dona
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Sotuvga tayyor bo‘lgan hajm
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Sotilgan Bloklar
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-text-primary tracking-tight">
              {totalSold.toLocaleString("uz-UZ")}{" "}
              <span className="text-sm font-normal text-text-secondary">
                dona
              </span>
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Jami realizatsiya qilingan
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Jami Tushum (Naqd)
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-emerald-400 tracking-tight">
              {formatUzs(totalPaid)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Jami savdo: {formatUzs(totalRevenue)}
            </p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-border-light hover:border-accent-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Mijozlar Qarzi (Nasiya)
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-amber-400 tracking-tight">
              {formatUzs(totalDebt)}
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Hali to‘lanmagan qarz mablag‘i
            </p>
          </div>
        </div>
      </div>

      {/* New Sale Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="glass-panel p-6 rounded-xl border border-accent-500/30 bg-dark-900 shadow-xl space-y-5 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-border-light pb-3">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent-500" />
              Yangi sotuvni rasmiylashtirish
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
              Mijoz ismi yoki tashkilot nomi
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Masalan: Jamshid aka (Qurilish)"
                  required
                  className="w-full pl-9 pr-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
                />
              </div>
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Sotuv sanasi
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Blok soni (Mavjud: {available.toLocaleString()} dona)
              <input
                type="number"
                min="1"
                max={available}
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Maksimal ${available}`}
                required
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Bir dona sotuv narxi (UZS)
              <input
                type="number"
                min="1"
                step="1"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Masalan: 3500"
                required
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>

            <label className="block text-xs font-medium text-text-secondary">
              Boshlang‘ich to‘lov (UZS)
              <input
                type="number"
                min="0"
                step="1"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder="0 (bo‘lib to‘lash / nasiya)"
                className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
              />
            </label>
          </div>

          {/* Real-time calculated amounts */}
          {Number(quantity) > 0 && Number(unitPrice) > 0 && (
            <div className="rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-border-light p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-text-secondary">Umumiy sotuv summasi:</p>
                <p className="text-lg font-bold text-text-primary mt-0.5">
                  {formatUzs(Number(quantity) * Number(unitPrice))}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">To‘langan miqdor:</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {formatUzs(Number(paid) || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Qolgan nasiya (qarz):</p>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {formatUzs(
                    Math.max(
                      0,
                      Number(quantity) * Number(unitPrice) - (Number(paid) || 0),
                    ),
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm transition-colors shadow-sm shadow-accent-500/20"
            >
              Sotuvni saqlash
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

      {/* Sales History Table */}
      <div className="glass-panel rounded-xl border border-border-light overflow-hidden">
        <div className="p-5 border-b border-border-light flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">Sotuvlar tarixi</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Barcha rasmiylashtirilgan shlakablok savdolari va to‘lov holati
            </p>
          </div>
          <span className="text-xs text-text-secondary">
            Jami: {sales.length} ta sotuv
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Yuklanmoqda...
          </div>
        ) : sales.length === 0 ? (
          <div className="py-12 text-center text-text-secondary text-sm">
            Hozircha birorta sotuv amalga oshirilmagan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-white/[0.02] text-text-secondary text-xs uppercase">
                <tr>
                  <th className="p-4">Sana</th>
                  <th className="p-4">Mijoz</th>
                  <th className="p-4">Hajmi</th>
                  <th className="p-4">Narxi</th>
                  <th className="p-4">Jami summa</th>
                  <th className="p-4">To‘langan</th>
                  <th className="p-4">Qarz</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light/40">
                {sales.map((sale) => {
                  const debt = sale.total - sale.paid;
                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 text-text-secondary text-xs font-medium">
                        {sale.date}
                      </td>
                      <td className="p-4 font-semibold text-text-primary">
                        {sale.customer}
                      </td>
                      <td className="p-4 font-medium text-text-primary">
                        {sale.quantity.toLocaleString("uz-UZ")} dona
                      </td>
                      <td className="p-4 text-text-secondary text-xs">
                        {formatUzs(sale.unitPrice)}
                      </td>
                      <td className="p-4 font-bold text-text-primary">
                        {formatUzs(sale.total)}
                      </td>
                      <td className="p-4 font-semibold text-emerald-400">
                        {formatUzs(sale.paid)}
                      </td>
                      <td className="p-4">
                        {debt > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {formatUzs(debt)}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            To‘liq to‘langan
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {debt > 0 && (
                            <button
                              type="button"
                              onClick={() => openPaymentModal(sale)}
                              className="px-2.5 py-1 rounded bg-accent-500/15 hover:bg-accent-500/25 text-accent-500 text-xs font-semibold border border-accent-500/30 transition-colors"
                            >
                              To‘lov olish
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void handleDeleteSale(sale.id)}
                            title="Sotuvni o‘chirish"
                            className="p-1 rounded text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Partial Payment Modal */}
      {paymentSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-border-light bg-dark-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Mijozdan to‘lov qabul qilish
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  {paymentSale.customer}
                </p>
              </div>
              <button
                onClick={() => setPaymentSale(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-border-light/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-text-secondary">Jami sotuv summasi:</span>
                <span className="font-semibold text-text-primary">
                  {formatUzs(paymentSale.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Ilgari to‘langan:</span>
                <span className="font-semibold text-emerald-400">
                  {formatUzs(paymentSale.paid)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border-light/40">
                <span className="text-text-secondary">Qoldiq qarz:</span>
                <span className="font-bold text-amber-400">
                  {formatUzs(paymentSale.total - paymentSale.paid)}
                </span>
              </div>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4">
              <label className="block text-xs font-medium text-text-secondary">
                Qabul qilinayotgan summa (UZS)
                <input
                  type="number"
                  min="1"
                  max={paymentSale.total - paymentSale.paid}
                  step="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="mt-1.5 w-full px-3 py-2.5 bg-dark-950 border border-border-light rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-500 transition-colors"
                />
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(
                      String(paymentSale.total - paymentSale.paid),
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-border-light text-text-secondary hover:text-text-primary transition-colors"
                >
                  Qarzni to‘liq yopish
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPaymentAmount(
                      String(
                        Math.floor((paymentSale.total - paymentSale.paid) / 2),
                      ),
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-border-light text-text-secondary hover:text-text-primary transition-colors"
                >
                  50% to‘lash
                </button>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="flex-1 py-2.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {isSubmittingPayment ? "Saqlanmoqda..." : "To‘lovni qabul qilish"}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentSale(null)}
                  className="px-4 py-2.5 rounded-lg border border-border-light text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
