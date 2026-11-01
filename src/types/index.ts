export interface StatCardData {
  title: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease'
  Icon: React.ComponentType<{ className?: string }>
  color: string
}

export interface NavItem {
  title: string
  url: string
  Icon: React.ComponentType<{ className?: string }>
}

export type ExpenseCategory =
  | 'metpisok'
  | 'sement'
  | 'elektr'
  | 'ishchi_haqi'
  | 'ovqat_puli'
  | 'kutilmagan'
  | 'fundament'

export interface ExpenseItem {
  id: string
  category: ExpenseCategory
  categoryName: string
  amount: number // in UZS, stored as integer to avoid floating point errors
  note: string
  isPerBatch: boolean // true = for whole batch, false = per single block
  createdAt: string
}

export interface ProductionBatch {
  id: string
  date: string
  quantity: number
  costPerBlock: number // snapshot at time of production
  totalCost: number
  note: string
  createdAt: string
}

export interface CostBreakdown {
  category: ExpenseCategory
  categoryName: string
  amount: number
  perBlock: number
  percentage: number
}

export interface CostCalculationResult {
  totalCost: number
  costPerBlock: number
  breakdown: CostBreakdown[]
}

export interface DashboardStats {
  totalBlocks: number
  totalSales: number
  totalRevenue: number
  totalProfit: number
  lowStock: number
}

export type AppPage = 'dashboard' | 'expenses' | 'production' | 'sales' | 'reports'

export interface DailyReport {
  date: string
  sold_blocks: number
  sales_count: number
  revenue: number
  paid: number
  debt: number
  expenses: number
  expenses_count: number
  expense_by_category: { name: string; amount: number }[]
  net_profit: number
  produced_blocks: number
  stock: number
}
