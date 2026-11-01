import type {
  ExpenseItem,
  CostCalculationResult,
  CostBreakdown,
} from '@/types'

export const EXPENSE_CATEGORIES: Record<
  ExpenseItem['category'],
  { name: string; order: number }
> = {
  metpisok: { name: 'Metpisok', order: 1 },
  sement: { name: 'Sement', order: 2 },
  elektr: { name: 'Elektr energiyasi', order: 3 },
  ishchi_haqi: { name: 'Blok chiqaruvchi ishchi haqi', order: 4 },
  ovqat_puli: { name: 'Ishchilarning ovqat puli', order: 5 },
  kutilmagan: { name: 'Kutilmagan xarajatlar', order: 6 },
  fundament: { name: 'Fundament qilish xarajati', order: 7 },
}

export function getCategoryName(category: ExpenseItem['category']): string {
  return EXPENSE_CATEGORIES[category]?.name || category
}

/**
 * Calculate cost per block from expense items.
 * - Per-batch expenses are divided by blockCount
 * - Per-block expenses are used as-is
 * All amounts stored as integers (UZS) to avoid floating point errors.
 */
export function calculateCostPerBlock(
  expenses: ExpenseItem[],
  blockCount: number
): CostCalculationResult {
  if (blockCount <= 0) {
    return {
      totalCost: 0,
      costPerBlock: 0,
      breakdown: [],
    }
  }

  let totalCost = 0
  const breakdown: CostBreakdown[] = []

  for (const expense of expenses) {
    const catName = getCategoryName(expense.category)
    let perBlock: number

    if (expense.isPerBatch) {
      // Divide batch expense by number of blocks
      perBlock = Math.round((expense.amount / blockCount) * 100) / 100
    } else {
      // Already per-block
      perBlock = expense.amount
    }

    totalCost += expense.isPerBatch ? expense.amount : perBlock * blockCount

    breakdown.push({
      category: expense.category,
      categoryName: catName,
      amount: expense.amount,
      perBlock,
      percentage: 0, // will be calculated below
    })
  }

  // Calculate percentages based on per-block contribution
  const costPerBlock = blockCount > 0 ? Math.round((totalCost / blockCount) * 100) / 100 : 0

  for (const item of breakdown) {
    item.percentage =
      costPerBlock > 0
        ? Math.round((item.perBlock / costPerBlock) * 1000) / 10
        : 0
  }

  return {
    totalCost,
    costPerBlock,
    breakdown,
  }
}

/**
 * Format UZS amount as string without decimals
 */
export function formatUzs(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount || 0))
}
