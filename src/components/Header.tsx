"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun, Menu, RefreshCw } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useFilters } from "@/context/FilterContext";

type HeaderProps = {
  onOpenSidebar: () => void;
};

export default function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { refreshOptions, loadingOptions } = useFilters();

  // Get Page Title
  const getPageTitle = () => {
    switch (pathname) {
      case "/":
        return "Dashboard";
      case "/accounts":
        return "Account Management";
      case "/ipos":
        return "IPO Registry";
      case "/applications":
        return "New Application Entry";
      case "/allotments":
        return "Allotment & Profit Tracker";
      case "/reports":
        return "Financial Reports";
      case "/settings":
        return "System Settings";
      default:
        return "IPO System";
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 text-card-foreground shadow-sm">
      {/* Page Title & Mobile Trigger */}
      <div className="flex items-center gap-3">
        <button
          className="rounded p-1 hover:bg-input lg:hidden"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
          {getPageTitle()}
        </h1>
      </div>

      {/* Header Actions */}
      <div className="flex items-center gap-4">
        {/* Sync Dropdowns Button */}
        <button
          onClick={refreshOptions}
          disabled={loadingOptions}
          title="Refresh Global Filters"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted hover:bg-input hover:text-foreground disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loadingOptions ? "animate-spin" : ""}`} />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted hover:bg-input hover:text-foreground transition-colors"
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        {/* Profile Avatar */}
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-accent p-[2px] shadow-md">
          <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-card text-xs font-bold text-foreground">
            AD
          </div>
        </div>
      </div>
    </header>
  );
}
