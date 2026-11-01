import { cn } from '@/lib/utils'
import type { StatCardData } from '@/types'

interface StatCardProps extends StatCardData {
  className?: string
}

export function StatCard({ value, change, changeType, Icon, color, className }: StatCardProps) {
  const isPositive = changeType === 'increase'

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: isPositive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>
          {isPositive ? (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6-6" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17H8m0 0V8m0 8l8-8" />
            </svg>
          )}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
        {change > 0 ? '+' : ''}{change}% oygacha
      </p>
    </div>
  )
}