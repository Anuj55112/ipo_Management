"use client";

import React, { useEffect, useState } from "react";
import { useFilters } from "@/context/FilterContext";
import {
  Settings,
  Coins,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Calculator,
  ShieldCheck
} from "lucide-react";

export default function SettingsPage() {
  const { refreshOptions } = useFilters();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // Form fields
  const [defaultCommission, setDefaultCommission] = useState("300");
  const [currency, setCurrency] = useState("INR");
  const [profitCalculationRules, setProfitCalculationRules] = useState("STANDARD");

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load system settings");
      const json = await res.json();
      setDefaultCommission(json.defaultCommission.toString());
      setCurrency(json.currency);
      setProfitCalculationRules(json.profitCalculationRules);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to load system configurations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultCommission: parseFloat(defaultCommission),
          currency,
          profitCalculationRules
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update configurations");
      }

      setSuccessMsg("System configurations updated successfully!");
      refreshOptions(); // Sync dropdown options and settings globally
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to save system configurations");
    } finally {
      setSaving(false);
    }
  };

  // Download Database Backup JSON
  const handleDownloadBackup = async () => {
    try {
      setBackingUp(true);
      setSuccessMsg(null);
      setErrorMsg(null);

      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Failed to extract database backup");
      const json = await res.json();

      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `IPO_Ledger_Backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSuccessMsg("Database backup snapshot exported and downloaded successfully!");
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to trigger database backup download");
    } finally {
      setBackingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">System Configurations</h2>
        <p className="text-sm text-muted">Configure default broker commissions, calculation math, and export database state.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-500 font-medium">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive font-medium">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">General Settings</h3>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Default Commission */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              <span>Default Commission (₹)</span>
            </label>
            <input
              type="number"
              value={defaultCommission}
              onChange={(e) => setDefaultCommission(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
            <p className="text-[11px] text-muted-foreground">Sets the pre-filled commission paid when entering new applications.</p>
          </div>

          {/* Currency Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted">Primary Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="INR">INR (₹) - Indian Rupees</option>
              <option value="USD">USD ($) - US Dollars</option>
              <option value="GBP">GBP (£) - British Pounds</option>
              <option value="EUR">EUR (€) - Euros</option>
            </select>
            <p className="text-[11px] text-muted-foreground">Changes the monetary formatting system across charts and tables.</p>
          </div>

          {/* Profit Calculation Rules */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-muted flex items-center gap-1">
              <Calculator className="h-3.5 w-3.5" />
              <span>Profit Calculation Rules</span>
            </label>
            <select
              value={profitCalculationRules}
              onChange={(e) => setProfitCalculationRules(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="STANDARD">
                Standard (Net Profit = Gross Profit - Commission. Not Allotted = -Commission)
              </option>
              <option value="COMMISSION_FREE">
                Commission Free (Net Profit = Gross Profit. Not Allotted = 0)
              </option>
            </select>
            <p className="text-[11px] text-muted-foreground">Configure whether brokerage commission costs subtract directly from profits.</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Configurations</span>
          </button>
        </div>
      </form>

      {/* Database Backup Card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="text-base font-bold text-foreground">Database Maintenance & Backups</h3>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1">
              <ShieldCheck className="h-4 w-4 text-success" />
              <span>Export Full Ledger Snapshot</span>
            </h4>
            <p className="text-xs text-muted max-w-md leading-relaxed">
              Export and download a complete JSON log containing all accounts, registered IPOs, applications, 
              and transactional ledgers for secure offline archiving.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={backingUp}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-input disabled:opacity-50 transition-all duration-200"
            >
              {backingUp ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>Download Backup File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
