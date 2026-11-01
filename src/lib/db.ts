import { supabase } from "@/lib/supabase";
import type { DailyReport, ExpenseItem, ProductionBatch } from "@/types";

export interface SaleItem {
  id: string;
  customer: string;
  quantity: number;
  unitPrice: number;
  total: number;
  paid: number;
  date: string;
  createdAt: string;
}

// =======================
// HELPERS
// =======================

const PAGE = 1000;

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message ? `${fallback} (${error.message})` : fallback);
}

/** Supabase bir so'rovda 1000 qatorgacha qaytaradi - hammasini sahifalab olamiz. */
async function fetchAll<T>(
  table: string,
  columns: string,
  orderBy?: string,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase.from(table).select(columns);
    if (orderBy) q = q.order(orderBy, { ascending: false });
    // barqaror sahifalash uchun id bo'yicha ham tartiblaymiz
    q = q.order("id", { ascending: true }).range(from, from + PAGE - 1);
    const { data, error } = await q;
    if (error) fail(error, "Ma’lumotlarni yuklashda xatolik");
    const rows = (data ?? []) as unknown as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function sumQuantity(table: "production_batches" | "sales"): Promise<number> {
  const rows = await fetchAll<{ quantity: number }>(table, "quantity");
  return rows.reduce((sum, r) => sum + Number(r.quantity), 0);
}

// =======================
// ROW MAPPERS (snake_case <-> camelCase)
// =======================

interface ExpenseRow {
  id: string;
  category: ExpenseItem["category"];
  category_name: string;
  amount: number;
  note: string;
  is_per_batch: boolean;
  created_at: string;
}
interface BatchRow {
  id: string;
  date: string;
  quantity: number;
  cost_per_block: number;
  total_cost: number;
  note: string;
  created_at: string;
}
interface SaleRow {
  id: string;
  customer: string;
  quantity: number;
  unit_price: number;
  total: number;
  paid: number;
  date: string;
  created_at: string;
}

export const toExpenseRow = (e: ExpenseItem): ExpenseRow => ({
  id: e.id,
  category: e.category,
  category_name: e.categoryName,
  amount: e.amount,
  note: e.note,
  is_per_batch: e.isPerBatch,
  created_at: e.createdAt,
});
const fromExpenseRow = (r: ExpenseRow): ExpenseItem => ({
  id: r.id,
  category: r.category,
  categoryName: r.category_name,
  amount: Number(r.amount),
  note: r.note ?? "",
  isPerBatch: r.is_per_batch,
  createdAt: r.created_at,
});

export const toBatchRow = (b: ProductionBatch): BatchRow => ({
  id: b.id,
  date: b.date,
  quantity: b.quantity,
  cost_per_block: b.costPerBlock,
  total_cost: b.totalCost,
  note: b.note,
  created_at: b.createdAt,
});
const fromBatchRow = (r: BatchRow): ProductionBatch => ({
  id: r.id,
  date: r.date,
  quantity: Number(r.quantity),
  costPerBlock: Number(r.cost_per_block),
  totalCost: Number(r.total_cost),
  note: r.note ?? "",
  createdAt: r.created_at,
});

export const toSaleRow = (s: SaleItem): SaleRow => ({
  id: s.id,
  customer: s.customer,
  quantity: s.quantity,
  unit_price: s.unitPrice,
  total: s.total,
  paid: s.paid,
  date: s.date,
  created_at: s.createdAt,
});
const fromSaleRow = (r: SaleRow): SaleItem => ({
  id: r.id,
  customer: r.customer ?? "",
  quantity: Number(r.quantity),
  unitPrice: Number(r.unit_price),
  total: Number(r.total),
  paid: Number(r.paid),
  date: r.date,
  createdAt: r.created_at,
});

// =======================
// EXPENSES OPERATIONS
// =======================

export async function saveExpense(expense: ExpenseItem): Promise<void> {
  if (!expense.id || typeof expense.id !== "string") {
    throw new Error("Xarajat identifikatori mavjud emas.");
  }
  if (!Number.isSafeInteger(expense.amount) || expense.amount <= 0) {
    throw new Error("Xarajat summasi musbat butun son bo‘lishi kerak.");
  }
  if (!expense.category) {
    throw new Error("Xarajat toifasi tanlanmagan.");
  }

  const { error } = await supabase
    .from("expenses")
    .upsert(toExpenseRow(expense), { onConflict: "id" });
  if (error) fail(error, "Xarajatni saqlashda xatolik");
}

export async function getExpenses(): Promise<ExpenseItem[]> {
  const rows = await fetchAll<ExpenseRow>("expenses", "*", "created_at");
  return rows.map(fromExpenseRow);
}

export async function deleteExpense(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error, "Xarajatni o‘chirishda xatolik");
  if (!data || data.length === 0) {
    throw new Error("O‘chiriladigan xarajat topilmadi.");
  }
}

// =======================
// PRODUCTION OPERATIONS
// =======================

export async function saveProductionBatch(
  batch: ProductionBatch,
): Promise<void> {
  if (!batch.id || typeof batch.id !== "string") {
    throw new Error("Partiya identifikatori mavjud emas.");
  }
  if (!Number.isSafeInteger(batch.quantity) || batch.quantity <= 0) {
    throw new Error("Blok soni musbat butun son bo‘lishi kerak.");
  }
  if (!Number.isSafeInteger(batch.costPerBlock) || batch.costPerBlock < 0) {
    throw new Error("Bir dona blok tannarxi manfiy bo‘lishi mumkin emas.");
  }
  if (!batch.date) {
    throw new Error("Ishlab chiqarish sanasi kiritilmagan.");
  }

  // Ombor xavfsizligi: ishlab chiqarilgan jami son sotilganidan kam bo'lmasin
  const [allBatches, totalSold] = await Promise.all([
    fetchAll<{ id: string; quantity: number }>(
      "production_batches",
      "id,quantity",
    ),
    sumQuantity("sales"),
  ]);
  const newTotalProduced =
    allBatches
      .filter((b) => b.id !== batch.id)
      .reduce((sum, b) => sum + Number(b.quantity), 0) + batch.quantity;

  if (newTotalProduced < totalSold) {
    throw new Error(
      `Ushbu o‘zgarishni kiritib bo‘lmaydi! Omborda allaqachon ${totalSold} dona sotilgan blok bor. Umumiy hajm ${totalSold} dan kam bo‘lolmaydi.`,
    );
  }

  const { error } = await supabase
    .from("production_batches")
    .upsert(toBatchRow(batch), { onConflict: "id" });
  if (error) fail(error, "Partiyani saqlashda xatolik");
}

export async function getProductionBatches(): Promise<ProductionBatch[]> {
  const rows = await fetchAll<BatchRow>(
    "production_batches",
    "*",
    "created_at",
  );
  return rows.map(fromBatchRow);
}

export async function deleteProductionBatch(id: string): Promise<void> {
  const [allBatches, totalSold] = await Promise.all([
    fetchAll<{ id: string; quantity: number }>(
      "production_batches",
      "id,quantity",
    ),
    sumQuantity("sales"),
  ]);

  const batch = allBatches.find((b) => b.id === id);
  if (!batch) {
    throw new Error("O‘chiriladigan partiya topilmadi.");
  }

  const totalProduced = allBatches.reduce(
    (sum, b) => sum + Number(b.quantity),
    0,
  );
  const remainingAfterDelete = totalProduced - Number(batch.quantity) - totalSold;

  if (remainingAfterDelete < 0) {
    throw new Error(
      `Ushbu partiyani o‘chirib bo‘lmaydi! Ombordan ${totalSold} dona blok sotilgan. Bu partiya (${batch.quantity} dona) o‘chirilsa, ombor qoldig‘i manfiy bo‘lib qoladi.`,
    );
  }

  const { error } = await supabase
    .from("production_batches")
    .delete()
    .eq("id", id);
  if (error) fail(error, "Partiyani o‘chirishda xatolik");
}

// =======================
// SALES OPERATIONS
// =======================

export async function getSales(): Promise<SaleItem[]> {
  const rows = await fetchAll<SaleRow>("sales", "*", "created_at");
  return rows.map(fromSaleRow);
}

export async function createSale(sale: SaleItem): Promise<void> {
  if (!sale.id || typeof sale.id !== "string") {
    throw new Error("Sotuv identifikatori mavjud emas.");
  }
  if (!Number.isSafeInteger(sale.quantity) || sale.quantity <= 0) {
    throw new Error("Sotilayotgan blok soni musbat butun son bo‘lishi kerak.");
  }
  if (!Number.isSafeInteger(sale.unitPrice) || sale.unitPrice <= 0) {
    throw new Error("Bir dona narx musbat butun son bo‘lishi kerak.");
  }
  if (!Number.isSafeInteger(sale.paid) || sale.paid < 0) {
    throw new Error("To‘lov miqdori manfiy bo‘lishi mumkin emas.");
  }
  if (sale.paid > sale.total) {
    throw new Error("To‘lov sotuv umumiy summasidan katta bo‘lishi mumkin emas.");
  }
  if (!sale.date) {
    throw new Error("Sotuv sanasi kiritilmagan.");
  }

  const [produced, sold] = await Promise.all([
    sumQuantity("production_batches"),
    sumQuantity("sales"),
  ]);
  const available = produced - sold;

  if (sale.quantity > available) {
    throw new Error(
      `Omborda yetarli blok yo‘q! Mavjud: ${available} dona, so‘ralgan: ${sale.quantity} dona.`,
    );
  }

  const { error } = await supabase.from("sales").insert(toSaleRow(sale));
  if (error) fail(error, "Sotuvni saqlashda xatolik");
}

export async function addSalePayment(
  id: string,
  amount: number,
): Promise<void> {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error("To‘lov miqdori musbat butun so‘m bo‘lishi kerak.");
  }

  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error, "Sotuvni o‘qishda xatolik");
  if (!data) {
    throw new Error("Sotuv yozuvi topilmadi.");
  }
  const sale = fromSaleRow(data as SaleRow);

  const remainingDebt = sale.total - sale.paid;
  if (remainingDebt <= 0) {
    throw new Error("Ushbu sotuv bo‘yicha barcha qarz to‘liq yopilgan.");
  }
  if (amount > remainingDebt) {
    throw new Error(
      `Kiritilgan to‘lov (${amount.toLocaleString()} UZS) qolgan qarzdan (${remainingDebt.toLocaleString()} UZS) oshib ketdi.`,
    );
  }

  const { error: updateError } = await supabase
    .from("sales")
    .update({ paid: sale.paid + amount })
    .eq("id", id);
  if (updateError) fail(updateError, "To‘lovni saqlashda xatolik");
}

export async function deleteSale(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("sales")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail(error, "Sotuvni o‘chirishda xatolik");
  if (!data || data.length === 0) {
    throw new Error("O‘chiriladigan sotuv topilmadi.");
  }
}

// =======================
// DAILY REPORT
// =======================

/** Kunlik hisobot (hisob-kitob bazadagi daily_report funksiyasida bajariladi). */
export async function getDailyReport(date: string): Promise<DailyReport> {
  const { data, error } = await supabase.rpc("daily_report", { p_date: date });
  if (error || !data) fail(error, "Kunlik hisobotni olishda xatolik");
  return data as DailyReport;
}

/** Hisobotni Telegram botga yuboradi (bazadagi send_daily_report funksiyasi orqali). */
export async function sendDailyReportToTelegram(date: string): Promise<void> {
  const { data, error } = await supabase.rpc("send_daily_report", {
    p_date: date,
  });
  if (error) throw new Error(error.message);

  const ids = ((data as { request_ids?: number[] } | null)?.request_ids ?? []);
  if (ids.length === 0) {
    throw new Error("Telegram chat ID topilmadi. 003_telegram_cron.sql ni tekshiring.");
  }

  // So'rov fonda yuboriladi - natijasini bir necha soniyadan keyin tekshiramiz
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const { data: status } = await supabase.rpc("telegram_status", {
    p_ids: ids,
  });
  const rows = (status ?? []) as {
    status_code: number | null;
    error: string | null;
    content: string | null;
  }[];

  const bad = rows.find((r) => r.error || (r.status_code && r.status_code !== 200));
  if (bad) {
    throw new Error(
      `Telegram xatosi: ${bad.error || bad.content || bad.status_code}. Bot token va chat ID ni tekshiring (botga avval Start bosganmisiz?).`,
    );
  }
}
