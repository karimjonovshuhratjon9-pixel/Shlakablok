// Barcha ma'lumotlar Supabase (PostgreSQL) bazasida saqlanadi.
export {
  getExpenses,
  saveExpense,
  deleteExpense,
  getProductionBatches,
  saveProductionBatch,
  deleteProductionBatch,
  getSales,
  createSale,
  addSalePayment,
  deleteSale,
  getDailyReport,
  sendDailyReportToTelegram,
} from "@/lib/db";
