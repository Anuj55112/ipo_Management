"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import FilterBar from "./FilterBar";
import { usePathname } from "next/navigation";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Settings page might not need global filter bar, but dashboard, accounts, ipos, reports, allotments, applications can display it.
  // Actually, displaying it everywhere except settings is very clean.
  const showFilterBar = pathname !== "/settings" && pathname !== "/applications";

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {showFilterBar && <FilterBar />}
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
