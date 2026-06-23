"use client";

import React, { useEffect, useState } from "react";
import { useFilters } from "@/context/FilterContext";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  TrendingUp,
  CreditCard,
  DollarSign,
  Briefcase,
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  Percent,
  TrendingDown
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

type KPIStats = {
  totalAccounts: number;
  activeIPOs: number;
  totalCapitalDeployed: number;
  totalCommissionPaid: number;
  totalGrossProfit: number;
  totalNetProfit: number;
  pendingApplications: number;
  allottedApplications: number;
  notAllottedApplications: number;
};

type AnalyticsStats = {
  successRate: number;
  roiPercentage: number;
  averageProfitPerIpo: number;
  averageCommissionCost: number;
  bestPerformingIpo: { name: string; profit: number } | null;
  worstPerformingIpo: { name: string; profit: number } | null;
  mostProfitableAccount: { name: string; profit: number } | null;
};

type StatsData = {
  kpis: KPIStats;
  analytics: AnalyticsStats;
  charts: {
    monthlyTrends: Array<{ month: string; netProfit: number; grossProfit: number; commission: number; capital: number }>;
    ipoBreakdown: Array<{ id: string; ipoName: string; netProfit: number; grossProfit: number; capital: number }>;
    accountBreakdown: Array<{ id: string; accountName: string; netProfit: number }>;
  };
};

export default function Dashboard() {
  const { filters } = useFilters();
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build query string based on global filters
        const params = new URLSearchParams();
        if (filters.accountId) params.append("accountId", filters.accountId);
        if (filters.ipoId) params.append("ipoId", filters.ipoId);
        if (filters.allotmentStatus) params.append("allotmentStatus", filters.allotmentStatus);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);

        const response = await fetch(`/api/dashboard/stats?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }
        const json = await response.json();
        setData(json);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.message || "Failed to load dashboard statistics");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters]);

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Metric Grid Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, idx) => (
            <div key={idx} className="h-28 rounded-2xl border border-border bg-card p-6" />
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-[350px] rounded-2xl border border-border bg-card" />
          <div className="h-[350px] rounded-2xl border border-border bg-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive animate-bounce" />
        <h3 className="mt-4 text-lg font-bold text-foreground">Error Loading Stats</h3>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, analytics, charts } = data;

  const kpiCards = [
    { label: "Total Accounts", value: kpis.totalAccounts, icon: Users, color: "text-blue-500 bg-blue-500/10" },
    { label: "Active IPOs", value: kpis.activeIPOs, icon: Briefcase, color: "text-amber-500 bg-amber-500/10" },
    { label: "Capital Deployed", value: formatCurrency(kpis.totalCapitalDeployed), icon: CreditCard, color: "text-indigo-500 bg-indigo-500/10" },
    { label: "Commission Paid", value: formatCurrency(kpis.totalCommissionPaid), icon: DollarSign, color: "text-pink-500 bg-pink-500/10" },
    { label: "Gross Profit", value: formatCurrency(kpis.totalGrossProfit), icon: Award, color: kpis.totalGrossProfit >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10" },
    { label: "Net Profit", value: formatCurrency(kpis.totalNetProfit), icon: TrendingUp, color: kpis.totalNetProfit >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10" },
    { label: "Pending Apps", value: kpis.pendingApplications, icon: Clock, color: "text-yellow-500 bg-yellow-500/10" },
    { label: "Allotted Apps", value: kpis.allottedApplications, icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" }
  ];

  return (
    <div className="space-y-6">
      {/* 1. KPIs Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted">{card.label}</span>
                <div className={`rounded-xl p-2.5 ${card.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-foreground">{card.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Advanced Analytics Panel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground">Advanced Analytics Overview</h3>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <div className="rounded-xl bg-input/50 p-4 text-center">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Allotment Rate</span>
            <div className="mt-2 flex items-center justify-center gap-1">
              <Percent className="h-4 w-4 text-primary" />
              <span className="text-lg font-bold">{analytics.successRate.toFixed(1)}%</span>
            </div>
          </div>

          <div className="rounded-xl bg-input/50 p-4 text-center">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">ROI Percentage</span>
            <div className="mt-2 flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-lg font-bold text-success">{analytics.roiPercentage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="rounded-xl bg-input/50 p-4 text-center">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Avg Profit / IPO</span>
            <div className="mt-2">
              <span className="text-lg font-bold">{formatCurrency(analytics.averageProfitPerIpo)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-input/50 p-4 text-center">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Avg Comm. Cost</span>
            <div className="mt-2">
              <span className="text-lg font-bold text-pink-500">{formatCurrency(analytics.averageCommissionCost)}</span>
            </div>
          </div>

          <div className="col-span-2 rounded-xl bg-input/50 p-4 text-left md:col-span-2">
            <span className="text-xs text-muted font-medium uppercase tracking-wider">Best / Worst IPO</span>
            <div className="mt-2 flex flex-col gap-1 text-sm font-semibold">
              <div className="flex justify-between">
                <span className="text-success truncate max-w-[120px]">{analytics.bestPerformingIpo?.name || "-"}</span>
                <span>{analytics.bestPerformingIpo ? formatCurrency(analytics.bestPerformingIpo.profit) : "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-destructive truncate max-w-[120px]">{analytics.worstPerformingIpo?.name || "-"}</span>
                <span>{analytics.worstPerformingIpo ? formatCurrency(analytics.worstPerformingIpo.profit) : "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly Net Profit Trend */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h4 className="text-base font-bold text-foreground">Monthly Profit Trend</h4>
            <p className="text-xs text-muted">Net profit realized by application month</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyTrends}>
                <defs>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  formatter={(val: any) => [formatCurrency(val), "Net Profit"]}
                />
                <Area type="monotone" dataKey="netProfit" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital Deployment Trend */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4">
            <h4 className="text-base font-bold text-foreground">Capital Deployment Trend</h4>
            <p className="text-xs text-muted">Total money sent by application month</p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyTrends}>
                <defs>
                  <linearGradient id="deployGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  formatter={(val: any) => [formatCurrency(val), "Capital Deployed"]}
                />
                <Area type="monotone" dataKey="capital" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#deployGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* IPO-wise Profit Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h4 className="text-base font-bold text-foreground">IPO-wise Profit breakdown</h4>
            <p className="text-xs text-muted">Net profit contribution from top IPOs</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.ipoBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="ipoName" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  formatter={(val: any) => [formatCurrency(val), "Net Profit"]}
                />
                <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                  {charts.ipoBreakdown.map((entry, index) => (
                    <rect
                      key={`rect-${index}`}
                      fill={entry.netProfit >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Account-wise Profit Breakdown */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h4 className="text-base font-bold text-foreground">Account-wise Profit Breakdown</h4>
            <p className="text-xs text-muted">Net profit generated by top accounts</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.accountBreakdown}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="accountName" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}
                  formatter={(val: any) => [formatCurrency(val), "Net Profit"]}
                />
                <Bar dataKey="netProfit" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
