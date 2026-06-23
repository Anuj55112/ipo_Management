"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FilePlus2,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Layers,
  Sparkles
} from "lucide-react";

type IpoOption = {
  id: string;
  ipoName: string;
  issuePrice: number;
  lotSize: number;
  status: string;
};

type AccountOption = {
  id: string;
  accountName: string;
  panNumber: string;
  bankName: string;
  upiId: string;
  status: string;
};

export default function ApplicationsPage() {
  const [ipos, setIpos] = useState<IpoOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultCommission, setDefaultCommission] = useState(300);

  // Form Fields
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [lots, setLots] = useState(1);
  const [amountSent, setAmountSent] = useState("");
  const [commissionPaid, setCommissionPaid] = useState("");
  const [applicationDate, setApplicationDate] = useState("");
  const [notes, setNotes] = useState("");

  // UI state
  const [keepIpoSelected, setKeepIpoSelected] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial select options
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [iposRes, accountsRes, settingsRes] = await Promise.all([
          fetch("/api/ipos"),
          fetch("/api/accounts?limit=1000"),
          fetch("/api/settings")
        ]);

        if (!iposRes.ok || !accountsRes.ok) throw new Error("Failed to load options");

        const iposData = await iposRes.json();
        const accountsData = await accountsRes.json();
        
        setIpos(iposData);
        // Only load ACTIVE accounts for making applications
        setAccounts(accountsData.accounts.filter((a: any) => a.status === "ACTIVE"));

        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setDefaultCommission(settings.defaultCommission || 300);
          setCommissionPaid(settings.defaultCommission.toString());
        }

        // Set default application date to today
        setApplicationDate(new Date().toISOString().split("T")[0]);
      } catch (error) {
        console.error("Failed to load application data:", error);
        setErrorMsg("Failed to initialize forms. Please check connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedIpo = ipos.find((i) => i.id === selectedIpoId);
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  // Auto-calculate Amount Sent when IPO or Lots change
  useEffect(() => {
    if (selectedIpo) {
      const calculatedAmount = selectedIpo.issuePrice * selectedIpo.lotSize * lots;
      setAmountSent(calculatedAmount.toString());
    } else {
      setAmountSent("");
    }
  }, [selectedIpoId, lots, ipos]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!selectedIpoId || !selectedAccountId || !amountSent || !commissionPaid || !applicationDate) {
      setErrorMsg("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          ipoId: selectedIpoId,
          amountSent: parseFloat(amountSent),
          commissionPaid: parseFloat(commissionPaid),
          applicationDate,
          notes
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit application");
      }

      setSuccessMsg(`Successfully logged application for ${json.account.accountName} under ${json.ipo.ipoName}!`);
      
      // Reset account fields, keeping IPO if configured
      setSelectedAccountId("");
      setNotes("");
      if (!keepIpoSelected) {
        setSelectedIpoId("");
        setLots(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* LEFT COLUMN: Entry Form */}
      <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <FilePlus2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Log New Application Entry</h3>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-500 font-medium animate-in fade-in slide-in-from-top-1">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Select IPO */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Select IPO *</label>
              <select
                required
                value={selectedIpoId}
                onChange={(e) => setSelectedIpoId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">-- Choose IPO --</option>
                {ipos.map((ipo) => (
                  <option key={ipo.id} value={ipo.id}>
                    {ipo.ipoName} ({ipo.status.charAt(0) + ipo.status.slice(1).toLowerCase()} - ₹{ipo.issuePrice})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Account */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Select Account *</label>
              <select
                required
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="">-- Choose Account --</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.panNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Lots Count */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Lots Applied *</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  required
                  value={lots}
                  onChange={(e) => setLots(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <span className="text-xs text-muted">
                  {selectedIpo ? `(${selectedIpo.lotSize * lots} shares)` : ""}
                </span>
              </div>
            </div>

            {/* Amount Sent */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Amount Sent (₹) *</label>
              <input
                type="number"
                required
                value={amountSent}
                onChange={(e) => setAmountSent(e.target.value)}
                placeholder="Total capital deployed"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Commission Paid */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Commission Paid (₹) *</label>
              <input
                type="number"
                required
                value={commissionPaid}
                onChange={(e) => setCommissionPaid(e.target.value)}
                placeholder="Commission to provider"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Application Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-muted">Application Date *</label>
              <input
                type="date"
                required
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted">Application Remarks (Notes)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Application Number, demat details..."
              rows={2}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Settings helper checkbox */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="keepIpo"
              checked={keepIpoSelected}
              onChange={(e) => setKeepIpoSelected(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
            />
            <label htmlFor="keepIpo" className="text-xs text-muted font-semibold cursor-pointer">
              Keep IPO selected for consecutive entries (Recommended for batch processing)
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-md shadow-primary/10"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>Log Application & Create Transactions</span>
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT COLUMN: Info Cards & Summary */}
      <div className="space-y-6">
        {/* Selection Summary */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-primary" />
            <span>Summary Preview</span>
          </h4>

          <div className="mt-4 space-y-4">
            {selectedIpo ? (
              <div className="rounded-xl bg-input/50 p-4 border border-border">
                <p className="text-xs text-muted font-bold">IPO DETAIL</p>
                <p className="font-bold text-foreground mt-1">{selectedIpo.ipoName}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted font-medium">
                  <div>Issue Price: <strong className="text-foreground">₹{selectedIpo.issuePrice}</strong></div>
                  <div>Lot Size: <strong className="text-foreground">{selectedIpo.lotSize} sh.</strong></div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-input/30 p-4 border border-dashed border-border flex items-center gap-2 text-xs text-muted">
                <Info className="h-4 w-4" />
                <span>No IPO selected</span>
              </div>
            )}

            {selectedAccount ? (
              <div className="rounded-xl bg-input/50 p-4 border border-border">
                <p className="text-xs text-muted font-bold">ACCOUNT DETAIL</p>
                <p className="font-bold text-foreground mt-1">{selectedAccount.accountName}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted font-medium">
                  <div>PAN: <strong className="text-foreground">{selectedAccount.panNumber}</strong></div>
                  <div>Bank: <strong className="text-foreground">{selectedAccount.bankName}</strong></div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-input/30 p-4 border border-dashed border-border flex items-center gap-2 text-xs text-muted">
                <Info className="h-4 w-4" />
                <span>No Account selected</span>
              </div>
            )}

            {selectedIpo && selectedAccount && (
              <div className="rounded-xl bg-primary/10 p-4 border border-primary/20 space-y-2">
                <h5 className="text-xs font-bold text-primary flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Calculated Deployment</span>
                </h5>
                <div className="text-sm font-semibold space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Principal Capital:</span>
                    <span>{formatCurrency(parseFloat(amountSent) || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted">Commission Cost:</span>
                    <span className="text-pink-500">+{formatCurrency(parseFloat(commissionPaid) || 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
                    <span>Total Cost Outlay:</span>
                    <span className="text-primary">{formatCurrency((parseFloat(amountSent) || 0) + (parseFloat(commissionPaid) || 0))}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workflow Guide */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm text-sm">
          <h4 className="font-bold text-foreground">Workflow Guidelines</h4>
          <ul className="mt-3 space-y-2.5 text-xs text-muted font-medium list-disc list-inside">
            <li>Applications are created in <span className="text-yellow-600 font-semibold">PENDING</span> status.</li>
            <li>Prisma transaction automatically registers a <span className="font-semibold text-foreground">DEPLOYMENT</span> transaction for the capital.</li>
            <li>A secondary <span className="font-semibold text-foreground">COMMISSION</span> transaction is recorded for bookkeeping.</li>
            <li>Make sure to use the <span className="font-semibold">"Keep IPO Selected"</span> option to quickly log applications for the same IPO across different client accounts sequentially.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
