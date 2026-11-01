// Eski (brauzer ichidagi IndexedDB) ma'lumotlarni Supabase'ga ko'chirish uchun.
// Faqat bir martalik ko'chirishda ishlatiladi.
import Dexie, { type Table } from "dexie";
import type { ExpenseItem, ProductionBatch } from "@/types";
import {
  toBatchRow,
  toExpenseRow,
  toSaleRow,
  type SaleItem,
} from "@/lib/db";
import { supabase } from "@/lib/supabase";

const DB_NAME = "ShlakablokDB";
const DONE_FLAG = "legacy_migrated_to_supabase";

class LegacyDB extends Dexie {
  expenses!: Table<ExpenseItem, string>;
  productionBatches!: Table<ProductionBatch, string>;
  sales!: Table<SaleItem, string>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      expenses: "id, category, createdAt",
      productionBatches: "id, date, createdAt",
    });
    this.version(2).stores({
      expenses: "id, category, createdAt",
      productionBatches: "id, date, createdAt",
      sales: "id, date, createdAt",
    });
  }
}

export interface LegacyCounts {
  expenses: number;
  batches: number;
  sales: number;
}

export function isLegacyMigrationDone(): boolean {
  try {
    return localStorage.getItem(DONE_FLAG) === "true";
  } catch {
    return false;
  }
}

export function markLegacyMigrationDone(): void {
  try {
    localStorage.setItem(DONE_FLAG, "true");
  } catch {
    // ignore
  }
}

/** Brauzerda eski ma'lumot bor bo'lsa, nechta yozuv borligini qaytaradi. */
export async function countLegacyData(): Promise<LegacyCounts | null> {
  try {
    if (!(await Dexie.exists(DB_NAME))) return null;
    const legacy = new LegacyDB();
    try {
      const [expenses, batches, sales] = await Promise.all([
        legacy.expenses.count(),
        legacy.productionBatches.count(),
        legacy.sales.count(),
      ]);
      if (expenses + batches + sales === 0) return null;
      return { expenses, batches, sales };
    } finally {
      legacy.close();
    }
  } catch {
    return null;
  }
}

async function upsertChunks(
  table: string,
  rows: object[],
): Promise<void> {
  const SIZE = 200;
  for (let i = 0; i < rows.length; i += SIZE) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + SIZE), { onConflict: "id" });
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
  }
}

/** Eski ma'lumotlarni Supabase'ga ko'chiradi (qayta bosilsa ham dublikat bo'lmaydi). */
export async function migrateLegacyData(): Promise<LegacyCounts> {
  const legacy = new LegacyDB();
  try {
    const [expenses, batches, sales] = await Promise.all([
      legacy.expenses.toArray(),
      legacy.productionBatches.toArray(),
      legacy.sales.toArray(),
    ]);

    await upsertChunks("expenses", expenses.map(toExpenseRow));
    await upsertChunks("production_batches", batches.map(toBatchRow));
    await upsertChunks("sales", sales.map(toSaleRow));

    markLegacyMigrationDone();
    return {
      expenses: expenses.length,
      batches: batches.length,
      sales: sales.length,
    };
  } finally {
    legacy.close();
  }
}
