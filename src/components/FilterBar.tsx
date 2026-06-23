"use client";

import React from "react";
import { useFilters } from "@/context/FilterContext";
import { Calendar, Filter, X } from "lucide-react";

export default function FilterBar() {
  const { filters, setFilters, resetFilters, ipoOptions, accountOptions } = useFilters();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const isFiltered = Object.values(filters).some((val) => val !== "");

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left Side: Filter Title */}
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="h-4 w-4 text-primary" />
          <span>Global Filters</span>
        </div>

        {/* Right Side: Reset Button */}
        {isFiltered && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-all duration-200"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Grid of inputs */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Account Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Select Account
          </label>
          <select
            name="accountId"
            value={filters.accountId}
            onChange={handleChange}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Accounts</option>
            {accountOptions.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accountName} {acc.status === "INACTIVE" ? "(Inactive)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* IPO Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Select IPO
          </label>
          <select
            name="ipoId"
            value={filters.ipoId}
            onChange={handleChange}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All IPOs</option>
            {ipoOptions.map((ipo) => (
              <option key={ipo.id} value={ipo.id}>
                {ipo.ipoName} ({ipo.status.charAt(0) + ipo.status.slice(1).toLowerCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Allotment Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Allotment Status
          </label>
          <select
            name="allotmentStatus"
            value={filters.allotmentStatus}
            onChange={handleChange}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ALLOTTED">Allotted</option>
            <option value="NOT_ALLOTTED">Not Allotted</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            From Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleChange}
              onClick={(e) => e.currentTarget.showPicker()}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* End Date */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted">
            To Date
          </label>
          <div className="relative">
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleChange}
              onClick={(e) => e.currentTarget.showPicker()}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
