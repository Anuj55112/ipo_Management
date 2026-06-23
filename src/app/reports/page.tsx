"use client";

import React, { useEffect, useState } from "react";
import { useFilters } from "@/context/FilterContext";
import { formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  BarChart3,
  Download,
  Printer,
  Loader2,
  AlertCircle,
  TrendingUp,
  FileSpreadsheet,
  FileText
} from "lucide-react";

type TabName = "account" | "ipo" | "monthly";

export default function ReportsPage() {
  const { filters } = useFilters();
  const [activeTab, setActiveTab] = useState<TabName>("account");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch report data
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query string from global filters
      const params = new URLSearchParams();
      if (filters.accountId) params.append("accountId", filters.accountId);
      if (filters.ipoId) params.append("ipoId", filters.ipoId);
      if (filters.allotmentStatus) params.append("allotmentStatus", filters.allotmentStatus);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch report statistics");
      }
      const json = await response.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to compile financial reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [filters]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (!data) return;
    
    let headers: string[] = [];
    let rows: any[] = [];
    let filename = "";

    if (activeTab === "account") {
      filename = "Account_Profit_Report.csv";
      headers = ["Account Name", "Total IPOs Applied", "Total Commission", "Total Net Profit"];
      rows = data.charts.accountBreakdown.map((item: any) => [
        item.accountName,
        item.count,
        item.commission,
        item.netProfit
      ]);
    } else if (activeTab === "ipo") {
      filename = "IPO_Profit_Report.csv";
      headers = ["IPO Name", "Applications", "Capital Deployed", "Gross Profit", "Net Profit"];
      rows = data.charts.ipoBreakdown.map((item: any) => [
        item.ipoName,
        item.count,
        item.capital,
        item.grossProfit,
        item.netProfit
      ]);
    } else {
      filename = "Monthly_Profit_Report.csv";
      headers = ["Month", "Capital Deployed", "Commission Paid", "Gross Profit", "Net Profit"];
      rows = data.charts.monthlyTrends.map((item: any) => [
        item.month,
        item.capital,
        item.commission,
        item.grossProfit,
        item.netProfit
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val: any) => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel using SheetJS
  const exportToExcel = () => {
    if (!data) return;

    let wsData: any[] = [];
    let filename = "";

    if (activeTab === "account") {
      filename = "Account_Profit_Report.xlsx";
      wsData = data.charts.accountBreakdown.map((item: any) => ({
        "Account Name": item.accountName,
        "Total IPOs Applied": item.count,
        "Total Commission (INR)": item.commission,
        "Total Net Profit (INR)": item.netProfit
      }));
    } else if (activeTab === "ipo") {
      filename = "IPO_Profit_Report.xlsx";
      wsData = data.charts.ipoBreakdown.map((item: any) => ({
        "IPO Name": item.ipoName,
        "Applications": item.count,
        "Capital Deployed (INR)": item.capital,
        "Gross Profit (INR)": item.grossProfit,
        "Net Profit (INR)": item.netProfit
      }));
    } else {
      filename = "Monthly_Profit_Report.xlsx";
      wsData = data.charts.monthlyTrends.map((item: any) => ({
        "Month": item.month,
        "Capital Deployed (INR)": item.capital,
        "Commission Paid (INR)": item.commission,
        "Gross Profit (INR)": item.grossProfit,
        "Net Profit (INR)": item.netProfit
      }));
    }

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
    XLSX.writeFile(wb, filename);
  };

  // Print PDF
  const triggerPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive animate-pulse" />
        <h4 className="mt-4 text-lg font-bold text-foreground">Failed to compile reports</h4>
        <p className="mt-1 text-sm text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Print-specific style injections */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Reports Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Financial Ledger Reports</h2>
          <p className="text-sm text-muted">Generate and export profit and loss ledgers grouped by Account, IPO, or Month.</p>
        </div>

        {/* Exports Dropdown Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-input transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
          
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-input transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
            <span>Excel</span>
          </button>

          <button
            onClick={triggerPrint}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/10 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border no-print">
        <button
          onClick={() => setActiveTab("account")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === "account"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Account Profit Report
        </button>

        <button
          onClick={() => setActiveTab("ipo")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === "ipo"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          IPO Profit Report
        </button>

        <button
          onClick={() => setActiveTab("monthly")}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
            activeTab === "monthly"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          Monthly Summary Report
        </button>
      </div>

      {/* REPORT PRINTING AREA */}
      <div id="print-area" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm p-2">
        {/* Print Title (only visible in print window) */}
        <div className="hidden print:block p-4 border-b border-border mb-4">
          <h1 className="text-xl font-bold">IPO Management Ledger - Financial Report</h1>
          <p className="text-xs text-slate-500 mt-1">Generated Date: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Tab 1: Account Profit */}
        {activeTab === "account" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4 text-center">Total IPOs Applied</th>
                  <th className="px-6 py-4 text-right">Total Commission Paid</th>
                  <th className="px-6 py-4 text-right">Net Profit Realized</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.charts.accountBreakdown.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-input/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{item.accountName}</td>
                    <td className="px-6 py-4 text-center font-bold">{item.count}</td>
                    <td className="px-6 py-4 text-right font-mono text-pink-500">
                      {formatCurrency(item.commission)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold font-mono ${
                        item.netProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(item.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: IPO Profit */}
        {activeTab === "ipo" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">IPO Name</th>
                  <th className="px-6 py-4 text-center">Applications Logged</th>
                  <th className="px-6 py-4 text-right">Capital Deployed</th>
                  <th className="px-6 py-4 text-right">Gross Profit</th>
                  <th className="px-6 py-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.charts.ipoBreakdown.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-input/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{item.ipoName}</td>
                    <td className="px-6 py-4 text-center font-bold">{item.count}</td>
                    <td className="px-6 py-4 text-right font-mono text-primary font-medium">
                      {formatCurrency(item.capital)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold font-mono ${
                        item.grossProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(item.grossProfit)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold font-mono ${
                        item.netProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(item.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Monthly Summary */}
        {activeTab === "monthly" && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4 text-right">Capital Deployed</th>
                  <th className="px-6 py-4 text-right">Commission Paid</th>
                  <th className="px-6 py-4 text-right">Gross Profit</th>
                  <th className="px-6 py-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.charts.monthlyTrends.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-input/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{item.month}</td>
                    <td className="px-6 py-4 text-right font-mono text-primary font-semibold">
                      {formatCurrency(item.capital)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-pink-500">
                      {formatCurrency(item.commission)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold font-mono ${
                        item.grossProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(item.grossProfit)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold font-mono ${
                        item.netProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(item.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
