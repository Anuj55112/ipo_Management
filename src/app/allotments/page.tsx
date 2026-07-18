"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useFilters } from "@/context/FilterContext";
import {
  CheckSquare,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  X,
  Play,
  FileSpreadsheet,
  History,
  ShieldAlert,
  Coins,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Search,
  Check,
  TrendingUp,
  FileText
} from "lucide-react";

type TabName = "center" | "import" | "audit" | "reconcile";

type Application = {
  id: string;
  accountId: string;
  ipoId: string;
  amountSent: number;
  commissionPaid: number;
  applicationDate: string;
  allotmentStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED";
  sharesAllotted: number;
  soldPrice: number | null;
  sellDate: string | null;
  notes?: string;
  account: {
    accountName: string;
    panNumber: string;
    bankName: string;
  };
  ipo: {
    ipoName: string;
    issuePrice: number;
    lotSize: number;
    listingDate: string;
  };
};

type AuditLog = {
  id: string;
  applicationId: string;
  updatedBy: string;
  previousStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED";
  newStatus: "PENDING" | "ALLOTTED" | "NOT_ALLOTTED";
  timestamp: string;
  source: string;
  application: {
    account: {
      accountName: string;
      panNumber: string;
    };
    ipo: {
      ipoName: string;
    };
  };
};

type ImportLog = {
  id: string;
  ipoId: string;
  fileName: string;
  successCount: number;
  failedCount: number;
  importedAt: string;
  ipo: {
    ipoName: string;
  };
};

export default function AllotmentsPage() {
  const { filters, ipoOptions } = useFilters();
  const [activeTab, setActiveTab] = useState<TabName>("center");
  const [applications, setApplications] = useState<Application[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Manual Update Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [manualStatus, setManualStatus] = useState<"ALLOTTED" | "NOT_ALLOTTED">("ALLOTTED");
  const [sharesAllotted, setSharesAllotted] = useState("");
  const [soldPrice, setSoldPrice] = useState("");
  const [sellDate, setSellDate] = useState("");
  const [commissionPaid, setCommissionPaid] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // API registrar auto-checker states
  const [checkingAPI, setCheckingAPI] = useState(false);
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [showApiTerminal, setShowApiTerminal] = useState(false);

  // CSV Bulk Import State
  const [selectedIpoId, setSelectedIpoId] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvPreview, setCsvPreview] = useState<{
    newAllotments: number;
    updatedRecords: number;
    failedMatches: number;
    rows: Array<{ pan: string; status: string; sharesAllotted: number; action: string; matchFound: boolean }>;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Profit Reconciliation States
  const [reconciling, setReconciling] = useState(false);
  const [reconSummary, setReconSummary] = useState<string | null>(null);

  // Fetch Central Checklist
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.accountId) params.append("accountId", filters.accountId);
      if (filters.ipoId) params.append("ipoId", filters.ipoId);
      if (filters.allotmentStatus) params.append("allotmentStatus", filters.allotmentStatus);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load applications list");
      const json = await res.json();
      setApplications(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load applications checklist");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/allotments/audit");
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      setAuditLogs(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch audit trails");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Import Logs
  const fetchImportLogs = async () => {
    try {
      const res = await fetch("/api/allotments/imports");
      if (res.ok) {
        const json = await res.json();
        setImportLogs(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Data based on active tab
  useEffect(() => {
    if (activeTab === "center" || activeTab === "reconcile") {
      fetchApplications();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    } else if (activeTab === "import") {
      fetchImportLogs();
    }
  }, [filters, activeTab]);

  // Open Manual Dialog
  const openManualModal = (app: Application) => {
    setSelectedApp(app);
    const statusVal = app.allotmentStatus === "PENDING" ? "ALLOTTED" : app.allotmentStatus as "ALLOTTED" | "NOT_ALLOTTED";
    setManualStatus(statusVal);
    setSharesAllotted(app.sharesAllotted > 0 ? app.sharesAllotted.toString() : app.ipo.lotSize.toString());
    setSoldPrice(app.soldPrice ? app.soldPrice.toString() : app.ipo.issuePrice.toString());
    setSellDate(app.sellDate ? app.sellDate.split("T")[0] : (app.ipo.listingDate ? app.ipo.listingDate.split("T")[0] : new Date().toISOString().split("T")[0]));
    setCommissionPaid(app.commissionPaid.toString());
    setModalError(null);
    setIsManualModalOpen(true);
  };

  // Submit Manual Update
  const handleManualUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setModalError(null);
    try {
      setUpdating(true);

      const payload = {
        applicationId: selectedApp.id,
        status: manualStatus,
        sharesAllotted: manualStatus === "ALLOTTED" ? parseInt(sharesAllotted, 10) : 0,
        soldPrice: manualStatus === "ALLOTTED" ? parseFloat(soldPrice) : null,
        sellDate: manualStatus === "ALLOTTED" ? sellDate : null,
        commissionPaid: parseFloat(commissionPaid) || 0,
        updatedBy: "Admin / Manual Resolve"
      };

      const res = await fetch("/api/allotments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to manually resolve status");
      }

      setIsManualModalOpen(false);
      fetchApplications();
    } catch (err: any) {
      setModalError(err.message || "Failed to update allotment");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Mark Not Allotted Directly
  const handleMarkNotAllottedDirectly = async (app: Application) => {
    if (!window.confirm(`Mark ${app.account.accountName} as NOT ALLOTTED? This will record a capital refund.`)) return;
    try {
      setLoading(true);
      const res = await fetch("/api/allotments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          status: "NOT_ALLOTTED",
          sharesAllotted: 0,
          soldPrice: null,
          sellDate: null,
          updatedBy: "Admin / Quick Check"
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update status");
      }
      fetchApplications();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  // Reset to Pending
  const handleResetToPending = async (app: Application) => {
    try {
      setLoading(true);
      const res = await fetch("/api/allotments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: app.id,
          status: "PENDING",
          sharesAllotted: 0,
          soldPrice: null,
          sellDate: null,
          updatedBy: "Admin / Quick Reset"
        })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to reset status");
      }
      fetchApplications();
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  // Server-side Auto-Check trigger
  const runApiChecker = async () => {
    setCheckingAPI(true);
    setShowApiTerminal(true);
    setApiLogs(["Initializing server-side allotment query..."]);

    try {
      const response = await fetch("/api/allotments/auto-check", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Server returned code ${response.status}`);
      }

      const json = await response.json();
      const logs = [
        `[System] ${json.message}`,
        `[Sync] Checked: ${json.checked} pending applications.`,
        `[Sync] Resolved and updated: ${json.resolved} records.`
      ];

      if (json.details && json.details.length > 0) {
        logs.push("-------------------------------------------");
        logs.push("Resolved Applications Details:");
        json.details.forEach((item: any) => {
          logs.push(`- ${item.account} (${item.pan}): ${item.status === 'ALLOTTED' ? 'Allotted ' + item.sharesAllotted + ' sh.' : 'Not Allotted (Refund)'} via ${item.source}`);
        });
      } else {
        logs.push("[Sync] No pending applications could be resolved at this time.");
      }

      setApiLogs(logs);
      fetchApplications();
    } catch (error: any) {
      console.error(error);
      setApiLogs((prev) => [...prev, `[Error] Connection or internal database issue: ${error.message || error}`]);
    } finally {
      setCheckingAPI(false);
    }
  };

  // CSV file parser and preview generator
  const handleCsvFileSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedIpoId) {
      alert("Please select the target IPO before uploading CSV.");
      e.target.value = "";
      return;
    }

    setCsvFileName(file.name);
    setImportSummary(null);
    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          throw new Error("CSV file requires headers and data rows.");
        }

        // Parse rows
        const parsedRows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.replace(/^["']|["']$/g, "").trim());
          if (cols.length < 3) continue;

          parsedRows.push({
            pan: cols[0],
            status: cols[1],
            sharesAllotted: parseInt(cols[2], 10) || 0
          });
        }

        setCsvRows(parsedRows);

        // Fetch current applications for this IPO to map preview details
        const ipoApplications = applications.filter(a => a.ipoId === selectedIpoId);
        
        let newAllotments = 0;
        let updatedRecords = 0;
        let failedMatches = 0;

        const previewRows = parsedRows.map((row) => {
          const formattedPan = row.pan.toUpperCase().trim();
          const targetApp = ipoApplications.find(a => a.account.panNumber === formattedPan);
          
          let action = "";
          let matchFound = false;

          if (!targetApp) {
            action = "Skip: PAN / Application not found under this IPO";
            failedMatches++;
          } else {
            matchFound = true;
            const normStatus = row.status.toUpperCase();
            const targetStatus = normStatus.includes("ALLOT") && !normStatus.includes("NOT") ? "ALLOTTED" : "NOT_ALLOTTED";

            if (targetApp.allotmentStatus === "PENDING") {
              action = `Resolve to ${targetStatus === "ALLOTTED" ? "ALLOTTED" : "NOT ALLOTTED"}`;
              newAllotments++;
            } else {
              action = `Update status from ${targetApp.allotmentStatus} to ${targetStatus}`;
              updatedRecords++;
            }
          }

          return {
            pan: formattedPan,
            status: row.status,
            sharesAllotted: row.sharesAllotted,
            action,
            matchFound
          };
        });

        setCsvPreview({
          newAllotments,
          updatedRecords,
          failedMatches,
          rows: previewRows
        });
      } catch (err: any) {
        alert(err.message || "Failed to process CSV file");
        setCsvFileName("");
      } finally {
        setImporting(false);
      }
    };

    reader.readAsText(file);
  };

  // Confirm CSV bulk import write
  const confirmCsvBulkImport = async () => {
    if (!selectedIpoId || csvRows.length === 0) return;

    try {
      setImporting(true);
      const res = await fetch("/api/allotments/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipoId: selectedIpoId,
          fileName: csvFileName,
          rows: csvRows
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to commit import records");
      }

      setImportSummary({
        successCount: json.successCount,
        failedCount: json.failedCount,
        errors: json.errors
      });

      // Clear preview state
      setCsvRows([]);
      setCsvFileName("");
      setCsvPreview(null);
      fetchImportLogs();
    } catch (err: any) {
      alert(err.message || "Failed to import CSV file");
    } finally {
      setImporting(false);
    }
  };

  // Run System Profit Recalculation
  const runProfitRecalculation = async () => {
    try {
      setReconciling(true);
      setReconSummary(null);

      const res = await fetch("/api/allotments/recalculate", { method: "POST" });
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || "Recalculation failed");
      }

      setReconSummary(json.message);
      fetchApplications();
    } catch (err: any) {
      alert(err.message || "Recalculation failed");
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex flex-wrap border-b border-border bg-card p-1 rounded-2xl shadow-sm gap-1 no-print">
        <button
          onClick={() => setActiveTab("center")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "center"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted hover:text-foreground hover:bg-input/50"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          <span>Allotment Center</span>
        </button>

        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "import"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted hover:text-foreground hover:bg-input/50"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Bulk Import CSV</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "audit"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted hover:text-foreground hover:bg-input/50"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Audit History</span>
        </button>

        <button
          onClick={() => setActiveTab("reconcile")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "reconcile"
              ? "bg-primary text-primary-foreground shadow-md"
              : "text-muted hover:text-foreground hover:bg-input/50"
          }`}
        >
          <Coins className="h-4 w-4" />
          <span>Profit Reconciliation</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ALLOTMENT CENTER */}
      {/* ======================================================== */}
      {activeTab === "center" && (
        <div className="space-y-6">
          {/* API auto integration checker card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary animate-pulse" />
                  <span>Auto Allotment Checking Service</span>
                </h3>
                <p className="text-xs text-muted max-w-2xl leading-relaxed">
                  Queries pending applications against registrar databases (Link Intime & KFintech) via secure server-side API query integrations.
                </p>
              </div>
              <button
                onClick={runApiChecker}
                disabled={checkingAPI}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary-hover hover:bg-primary px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 shadow-md shadow-primary/10"
              >
                {checkingAPI ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>Run Registrar Checker</span>
              </button>
            </div>

            {showApiTerminal && (
              <div className="mt-4 rounded-xl border border-border bg-input/50 p-4 font-mono text-xs text-muted max-h-48 overflow-y-auto space-y-1 relative">
                <button
                  onClick={() => setShowApiTerminal(false)}
                  className="absolute top-2 right-2 rounded p-1 hover:bg-border"
                >
                  <X className="h-3 w-3" />
                </button>
                {apiLogs.map((log, index) => (
                  <p key={index}>{log}</p>
                ))}
              </div>
            )}
          </div>

          {/* Checklist table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-input/20">
              <h4 className="text-base font-bold text-foreground">Applications Checklist</h4>
              <p className="text-xs text-muted">Update allotment statuses to process capital refunds or listing sales.</p>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-6">
                <AlertCircle className="h-12 w-12 text-destructive animate-pulse" />
                <h4 className="mt-4 text-lg font-bold text-foreground">Failed to load checklist</h4>
                <p className="mt-1 text-sm text-muted">{error}</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-6">
                <CheckSquare className="h-12 w-12 text-muted" />
                <h4 className="mt-4 text-lg font-bold text-foreground">No applications logged</h4>
                <p className="mt-1 text-sm text-muted">No records match current global filter settings.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-6 py-4">Account Name (PAN)</th>
                      <th className="px-6 py-4">IPO Applied (Price)</th>
                      <th className="px-6 py-4 text-right">Capital Sent</th>
                      <th className="px-6 py-4 text-right">Commission Cost</th>
                      <th className="px-6 py-4 text-center">Date Applied</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-input/20 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-foreground">{app.account.accountName}</p>
                            <p className="text-xs text-muted font-mono">{app.account.panNumber}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-foreground">{app.ipo.ipoName}</p>
                            <p className="text-xs text-muted">Issue: ₹{app.ipo.issuePrice}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">{formatCurrency(app.amountSent)}</td>
                        <td className="px-6 py-4 text-right font-mono text-pink-500">{formatCurrency(app.commissionPaid)}</td>
                        <td className="px-6 py-4 text-center text-muted font-semibold">{formatDate(app.applicationDate)}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              app.allotmentStatus === "ALLOTTED"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : app.allotmentStatus === "NOT_ALLOTTED"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-yellow-500/10 text-yellow-600"
                            }`}
                          >
                            {app.allotmentStatus === "PENDING" && <Clock className="h-3 w-3" />}
                            {app.allotmentStatus === "ALLOTTED" && <CheckCircle className="h-3 w-3" />}
                            {app.allotmentStatus === "NOT_ALLOTTED" && <XCircle className="h-3 w-3" />}
                            <span>{app.allotmentStatus === "NOT_ALLOTTED" ? "Not Allotted" : app.allotmentStatus.charAt(0) + app.allotmentStatus.slice(1).toLowerCase()}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {app.allotmentStatus === "PENDING" ? (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openManualModal(app)}
                                className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                              >
                                Allotted
                              </button>
                              <button
                                onClick={() => handleMarkNotAllottedDirectly(app)}
                                className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                Refund
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2.5">
                              <button
                                onClick={() => openManualModal(app)}
                                className="text-xs text-primary hover:underline font-semibold"
                              >
                                Edit
                              </button>
                              <span className="text-muted/30">|</span>
                              <button
                                onClick={() => handleResetToPending(app)}
                                className="text-xs text-muted hover:text-foreground font-semibold hover:underline"
                              >
                                Reset
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: BULK IMPORT CSV */}
      {/* ======================================================== */}
      {activeTab === "import" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-bold text-foreground">Import Allotment CSV</h3>
              <p className="text-xs text-muted mt-1">Upload a CSV file containing PAN, Status (Allotted/Not Allotted), and SharesAllotted.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* IPO Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Select target IPO *</label>
                <select
                  value={selectedIpoId}
                  onChange={(e) => {
                    setSelectedIpoId(e.target.value);
                    setCsvPreview(null);
                  }}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="">-- Choose IPO --</option>
                  {ipoOptions.map((ipo) => (
                    <option key={ipo.id} value={ipo.id}>
                      {ipo.ipoName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Upload CSV File *</label>
                <input
                  type="file"
                  accept=".csv"
                  disabled={!selectedIpoId}
                  onChange={handleCsvFileSelection}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* CSV Ingestion Preview */}
            {csvPreview && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
                  <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
                    <span className="text-xs text-emerald-500 font-bold uppercase tracking-wider">New Allotments</span>
                    <p className="text-2xl font-bold mt-1 text-emerald-600">{csvPreview.newAllotments}</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-4 text-center">
                    <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">Updated Records</span>
                    <p className="text-2xl font-bold mt-1 text-blue-600">{csvPreview.updatedRecords}</p>
                  </div>
                  <div className="rounded-xl bg-destructive/10 p-4 text-center">
                    <span className="text-xs text-destructive font-bold uppercase tracking-wider">Failed Matches</span>
                    <p className="text-2xl font-bold mt-1 text-destructive">{csvPreview.failedMatches}</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="border-b border-border bg-input/50 font-bold uppercase text-muted">
                        <tr>
                          <th className="px-4 py-2">PAN Number</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2 text-center">Shares</th>
                          <th className="px-4 py-2">Ingestion Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {csvPreview.rows.map((row, idx) => (
                          <tr key={idx} className={row.matchFound ? "hover:bg-input/20" : "bg-destructive/5 text-destructive"}>
                            <td className="px-4 py-2 font-mono font-bold">{row.pan}</td>
                            <td className="px-4 py-2 font-semibold">{row.status}</td>
                            <td className="px-4 py-2 text-center font-bold">{row.sharesAllotted}</td>
                            <td className="px-4 py-2 font-medium">{row.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setCsvPreview(null);
                      setCsvFileName("");
                    }}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-input transition-colors"
                  >
                    Clear File
                  </button>
                  <button
                    onClick={confirmCsvBulkImport}
                    disabled={importing}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/10 transition-colors"
                  >
                    {importing && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Confirm Import & Update Ledger</span>
                  </button>
                </div>
              </div>
            )}

            {/* Success Summary */}
            {importSummary && (
              <div className="rounded-xl bg-emerald-500/10 p-4 text-emerald-500 border border-emerald-500/20 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <h4 className="font-bold text-sm">CSV Import Committed Successfully!</h4>
                </div>
                <p className="text-xs font-semibold">
                  Successfully imported <strong>{importSummary.successCount}</strong> applications. Skipped/Failed: <strong>{importSummary.failedCount}</strong> rows.
                </p>
                {importSummary.errors.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted">Skip Details:</span>
                    <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-input/50 p-2 font-mono text-[10px] text-muted space-y-0.5">
                      {importSummary.errors.map((err: string, i: number) => (
                        <p key={i}>• {err}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Import History Table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-input/20">
              <h4 className="text-sm font-bold text-foreground">Imports History Log</h4>
            </div>
            {importLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted">No CSV imports recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="border-b border-border bg-input/50 font-bold uppercase text-muted">
                    <tr>
                      <th className="px-6 py-3">Import Date</th>
                      <th className="px-6 py-3">File Name</th>
                      <th className="px-6 py-3">IPO Target</th>
                      <th className="px-6 py-3 text-center">Success Ingests</th>
                      <th className="px-6 py-3 text-center">Fail Skips</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted">
                    {importLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-input/20">
                        <td className="px-6 py-3 font-semibold text-foreground">{formatDate(log.importedAt)}</td>
                        <td className="px-6 py-3 font-medium text-foreground">{log.fileName}</td>
                        <td className="px-6 py-3 font-semibold">{log.ipo.ipoName}</td>
                        <td className="px-6 py-3 text-center text-emerald-600 font-bold">{log.successCount} rows</td>
                        <td className="px-6 py-3 text-center text-destructive font-bold">{log.failedCount} rows</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AUDIT HISTORY */}
      {/* ======================================================== */}
      {activeTab === "audit" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-input/20">
            <h4 className="text-base font-bold text-foreground">Allotment Security Audit Trail</h4>
            <p className="text-xs text-muted">Tracks every allotment state change for compliance and verification checks.</p>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted">No audit logs recorded. Allotments are currently clean.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Client Name (PAN)</th>
                    <th className="px-6 py-4">IPO Target</th>
                    <th className="px-6 py-4 text-center">Previous Status</th>
                    <th className="px-6 py-4 text-center">New Status</th>
                    <th className="px-6 py-4">Operator</th>
                    <th className="px-6 py-4 text-center">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-input/20 transition-colors text-muted">
                      <td className="px-6 py-4 font-mono text-xs">{new Date(log.timestamp).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{log.application.account.accountName}</p>
                          <p className="text-xs font-mono">{log.application.account.panNumber}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">{log.application.ipo.ipoName}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs uppercase font-medium">{log.previousStatus}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            log.newStatus === "ALLOTTED"
                              ? "bg-emerald-500/10 text-emerald-500"
                              : log.newStatus === "NOT_ALLOTTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-yellow-500/10 text-yellow-600"
                          }`}
                        >
                          {log.newStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">{log.updatedBy}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="rounded bg-input px-1.5 py-0.5 text-[10px] font-bold text-foreground">{log.source}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PROFIT RECONCILIATION */}
      {/* ======================================================== */}
      {activeTab === "reconcile" && (
        <div className="space-y-6">
          {/* Sync Trigger Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-amber-500 animate-bounce" />
                  <span>Run Database Recalculation Check</span>
                </h3>
                <p className="text-xs text-muted max-w-2xl leading-relaxed">
                  Recalculates profits and synchronizes transaction outflow/inflow arrays across all applications. Use this tool if transactions list falls out-of-sync with allotment logs.
                </p>
              </div>
              <button
                onClick={runProfitRecalculation}
                disabled={reconciling}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 px-5 py-2.5 text-sm font-bold text-amber-600 transition-all duration-200"
              >
                {reconciling ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                <span>Recalculate Ledger</span>
              </button>
            </div>

            {reconSummary && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-500 font-medium animate-in fade-in duration-200">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <span>{reconSummary}</span>
              </div>
            )}
          </div>

          {/* Detailed Calculations breakdown */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-input/20">
              <h4 className="text-base font-bold text-foreground">Realized ROI Formula Breakdowns</h4>
              <p className="text-xs text-muted">Detailed net profit calculation audit per application based on status.</p>
            </div>

            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : applications.filter(a => a.allotmentStatus !== "PENDING").length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">No resolved applications found. Clear pending applications first.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="px-6 py-4">Account (PAN)</th>
                      <th className="px-6 py-4">IPO Target</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4">Calculation Formula Audit</th>
                      <th className="px-6 py-4 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted">
                    {applications.filter(a => a.allotmentStatus !== "PENDING").map((app) => {
                      const isAllotted = app.allotmentStatus === "ALLOTTED";
                      const soldPriceVal = app.soldPrice || app.ipo.issuePrice;
                      const profit = isAllotted 
                        ? (soldPriceVal - app.ipo.issuePrice) * app.sharesAllotted - app.commissionPaid
                        : -app.commissionPaid;
                      
                      return (
                        <tr key={app.id} className="hover:bg-input/20">
                          <td className="px-6 py-4 font-semibold text-foreground">{app.account.accountName}</td>
                          <td className="px-6 py-4 font-semibold text-foreground">{app.ipo.ipoName}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${isAllotted ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                              {app.allotmentStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {isAllotted ? (
                              <span>
                                (Sold ₹{soldPriceVal} - Issue ₹{app.ipo.issuePrice}) × {app.sharesAllotted} shares - Comm ₹{app.commissionPaid}
                              </span>
                            ) : (
                              <span>
                                Non-allotment: Refund outlay - Comm ₹{app.commissionPaid}
                              </span>
                            )}
                          </td>
                          <td className={`px-6 py-4 text-right font-bold font-mono ${profit >= 0 ? "text-success" : "text-destructive"}`}>
                            {formatCurrency(profit)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MANUAL ENTRY MODAL DIALOG */}
      {/* ======================================================== */}
      {isManualModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Resolve Allotment Status</h3>
                <p className="text-xs text-muted">
                  Log status for {selectedApp.account.accountName} under {selectedApp.ipo.ipoName}
                </p>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-input hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleManualUpdateSubmit} className="mt-4 space-y-4">
              {modalError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Status Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Allotment Status *</label>
                <select
                  value={manualStatus}
                  onChange={(e: any) => setManualStatus(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                >
                  <option value="ALLOTTED">Allotted</option>
                  <option value="NOT_ALLOTTED">Not Allotted</option>
                </select>
              </div>

              {/* Commission Paid Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Commission Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commissionPaid}
                  onChange={(e) => setCommissionPaid(e.target.value)}
                  placeholder="Commission cost"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {manualStatus === "ALLOTTED" && (
                <>
                  {/* Shares Allotted */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted">Shares Allotted *</label>
                    <input
                      type="number"
                      required
                      value={sharesAllotted}
                      onChange={(e) => setSharesAllotted(e.target.value)}
                      placeholder={`Default lot is ${selectedApp.ipo.lotSize}`}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Sold Price */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted">Sold Price per Share (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={soldPrice}
                      onChange={(e) => setSoldPrice(e.target.value)}
                      placeholder="e.g. 520"
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  {/* Sell Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted">Sell Date *</label>
                    <input
                      type="date"
                      required
                      value={sellDate}
                      onChange={(e) => setSellDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Calculation summary */}
                  {sharesAllotted && soldPrice && (
                    <div className="rounded-xl bg-primary/10 p-4 text-xs font-semibold text-primary space-y-1">
                      <div className="flex justify-between">
                        <span>Investment Value:</span>
                        <span>{formatCurrency(selectedApp.ipo.issuePrice * parseInt(sharesAllotted, 10))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sale Value:</span>
                        <span>{formatCurrency(parseFloat(soldPrice) * parseInt(sharesAllotted, 10))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Commission Payout:</span>
                        <span className="text-destructive">-{formatCurrency(parseFloat(commissionPaid) || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1 font-bold text-sm">
                        <span>Net Profit:</span>
                        <span>
                          {formatCurrency(
                            (parseFloat(soldPrice) - selectedApp.ipo.issuePrice) * parseInt(sharesAllotted, 10) -
                              (parseFloat(commissionPaid) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-input transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Status</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
