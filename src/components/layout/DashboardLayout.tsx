import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { AppPage } from "@/types";
import * as React from "react";

interface DashboardLayoutProps {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  activePage,
  onPageChange,
  children,
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Persist desktop collapsed preference
  useEffect(() => {
    try {
      localStorage.setItem("sidebar_collapsed", String(isCollapsed));
    } catch {
      // Ignore
    }
  }, [isCollapsed]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  // Automatically close mobile drawer when resized to desktop viewport
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobileOpen]);

  // Lock body scroll on mobile when sidebar is open to prevent background scrolling
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const handleToggleMobile = () => {
    setIsMobileOpen((prev) => !prev);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-dark-950 text-text-primary">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 dark:bg-black/75 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Menyuni yopish"
        />
      )}

      {/* Unified Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={(page) => {
          onPageChange(page);
          setIsMobileOpen(false);
        }}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:ml-20" : "md:ml-72"
        }`}
      >
        <TopBar
          isMobileOpen={isMobileOpen}
          isCollapsed={isCollapsed}
          onSidebarToggle={handleToggleMobile}
          onDesktopCollapseToggle={handleToggleCollapse}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-dark-950 transition-colors duration-200">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
