import {
  LayoutDashboard,
  CreditCard,
  Factory,
  ShoppingCart,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppPage } from '@/types'

interface SidebarProps {
  activePage: AppPage
  onPageChange: (page: AppPage) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  isMobileOpen: boolean
  onCloseMobile: () => void
}

const navItems: { title: string; page: AppPage; Icon: React.ComponentType<{ className?: string }> }[] = [
  { title: 'Bosh sahifa', page: 'dashboard', Icon: LayoutDashboard },
  { title: 'Xarajatlar', page: 'expenses', Icon: CreditCard },
  { title: 'Ishlab chiqarish', page: 'production', Icon: Factory },
  { title: 'Savdo va ombor', page: 'sales', Icon: ShoppingCart },
  { title: 'Hisobotlar', page: 'reports', Icon: BarChart3 },
]

export function Sidebar({
  activePage,
  onPageChange,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-50 flex flex-col border-r border-border-light bg-dark-900 transition-all duration-300 ease-in-out',
        // Mobile drawer behavior
        isMobileOpen
          ? 'translate-x-0 w-72 shadow-2xl'
          : '-translate-x-full md:translate-x-0',
        // Desktop collapsed/expanded behavior
        isCollapsed ? 'md:w-20' : 'md:w-72'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border-light shrink-0">
        <button
          onClick={() => onPageChange('dashboard')}
          className="flex items-center gap-3 overflow-hidden text-left focus:outline-none"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-accent-500 to-accent-600 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-accent-500/20">
            <Factory className="w-5 h-5 text-white" />
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-text-primary">
                Shlakablok
              </span>
              <span className="text-[10px] text-accent-500 uppercase font-semibold tracking-wider">
                Ishlab chiqarish
              </span>
            </div>
          )}
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={isCollapsed ? "Kengaytirish" : "Kichraytirish"}
          aria-label={isCollapsed ? "Kengaytirish" : "Kichraytirish"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title="Menyuni yopish"
          aria-label="Menyuni yopish"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.Icon
          const isActive = activePage === item.page
          const showLabel = !isCollapsed || isMobileOpen

          return (
            <button
              key={item.page}
              onClick={() => onPageChange(item.page)}
              className={cn(
                'sidebar-item w-full flex items-center rounded-lg transition-all duration-200 group relative',
                isCollapsed && !isMobileOpen ? 'justify-center px-2 py-3' : 'justify-start px-4 py-3 gap-3',
                isActive && 'active bg-accent-500/10 text-accent-500 border border-accent-500/20 shadow-sm'
              )}
              title={isCollapsed && !isMobileOpen ? item.title : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-accent-500' : 'text-text-secondary group-hover:text-text-primary'
                )}
              />
              {showLabel && (
                <span
                  className={cn(
                    'text-sm font-medium transition-colors truncate',
                    isActive ? 'text-accent-500 font-semibold' : 'text-text-primary'
                  )}
                >
                  {item.title}
                </span>
              )}

              {/* Collapsed Active Indicator on right */}
              {isActive && isCollapsed && !isMobileOpen && (
                <span className="absolute right-1 top-2 bottom-2 w-1 bg-accent-500 rounded-full" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-border-light space-y-2 shrink-0">
        {(!isCollapsed || isMobileOpen) && (
          <div className="px-3 py-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-border-light/40 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Tizim holati:</span>
              <span className="inline-flex items-center gap-1.5 text-accent-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
                Faol
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
