import {
  Search,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

interface TopBarProps {
  isMobileOpen: boolean
  isCollapsed: boolean
  onSidebarToggle: () => void
  onDesktopCollapseToggle: () => void
}

export function TopBar({
  isMobileOpen,
  isCollapsed,
  onSidebarToggle,
  onDesktopCollapseToggle,
}: TopBarProps) {
  const { isDark, toggleTheme } = useTheme()
  return (
    <>
      <header className="h-16 border-b border-border-light bg-dark-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors duration-200">
        <div className="flex h-full items-center justify-between px-4 md:px-6 w-full">
          <div className="flex items-center gap-3">
            {/* Hamburger button for mobile */}
            <button
              onClick={onSidebarToggle}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors md:hidden"
              aria-label={isMobileOpen ? "Menyuni yopish" : "Menyuni ochish"}
              title={isMobileOpen ? "Menyuni yopish" : "Menyuni ochish"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Collapse Toggle in Topbar */}
            <button
              onClick={onDesktopCollapseToggle}
              className="hidden md:flex p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={isCollapsed ? "Sidebar-ni kengaytirish" : "Sidebar-ni kichraytirish"}
              aria-label={isCollapsed ? "Sidebar-ni kengaytirish" : "Sidebar-ni kichraytirish"}
            >
              {isCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* Search Input */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="relative w-60 md:w-72 lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tizim bo‘yicha qidirish..."
                  className="w-full pl-9 pr-4 py-2 bg-dark-950 border border-border-light rounded-lg text-xs md:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Instant Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title={isDark ? "Kunduzgi rejimga o‘tish" : "Tungi rejimga o‘tish"}
              aria-label={isDark ? "Kunduzgi rejimga o‘tish" : "Tungi rejimga o‘tish"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
              )}
            </button>

          </div>
        </div>
      </header>
    </>
  )
}
