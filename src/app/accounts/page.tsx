"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  FileSpreadsheet,
  Users
} from "lucide-react";

type Account = {
  id: string;
  accountName: string;
  panNumber: string;
  bankName: string;
  accountNumber: string;
  upiId: string;
  phoneNumber: string;
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  totalApplications: number;
  totalProfit: number;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    accountName: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    upiId: "",
    phoneNumber: "",
    status: "ACTIVE",
    notes: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Bulk Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    skipCount: number;
    errors: string[];
  } | null>(null);

  // Fetch Accounts Function
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString()
      });

      const res = await fetch(`/api/accounts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load accounts");
      const json = await res.json();
      
      setAccounts(json.accounts);
      setTotalPages(json.pagination.pages || 1);
      setTotalCount(json.pagination.total || 0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [search, statusFilter, page]);

  // Handle Search Input Change (Debounced / Delayed trigger)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset page to 1 when search changes
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      accountName: "",
      panNumber: "",
      bankName: "",
      accountNumber: "",
      upiId: "",
      phoneNumber: "",
      status: "ACTIVE",
      notes: ""
    });
    setFormError(null);
    setModalMode("add");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (account: Account) => {
    setFormData({
      accountName: account.accountName,
      panNumber: account.panNumber,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      upiId: account.upiId,
      phoneNumber: account.phoneNumber,
      status: account.status,
      notes: account.notes || ""
    });
    setSelectedAccountId(account.id);
    setFormError(null);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Simple Form Validation
    const { accountName, panNumber, bankName, accountNumber, upiId, phoneNumber } = formData;
    if (!accountName || !panNumber || !bankName || !accountNumber || !upiId || !phoneNumber) {
      setFormError("All fields except notes are required.");
      return;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;
    if (!panRegex.test(panNumber)) {
      setFormError("Invalid PAN card format. Expected pattern: ABCDE1234F");
      return;
    }

    if (phoneNumber.length < 10) {
      setFormError("Phone number must be at least 10 digits.");
      return;
    }

    try {
      setSubmitting(true);
      const url = modalMode === "add" ? "/api/accounts" : `/api/accounts/${selectedAccountId}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Something went wrong saving account");
      }

      setIsModalOpen(false);
      fetchAccounts();
    } catch (err: any) {
      setFormError(err.message || "Failed to save account details");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will cascade delete all associated applications and transactions.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete account");
      }
      fetchAccounts();
    } catch (err: any) {
      alert(err.message || "Failed to delete account");
      setLoading(false);
    }
  };

  // Handle CSV Bulk Import Parsing
  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("Could not read file text");

        // Simple CSV Parser (splits by line and then commas, handles quotes roughly)
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) {
          throw new Error("CSV file must contain a header row and at least one data row");
        }

        // Expected Columns: Account Name, PAN, Bank, Account Number, UPI, Phone, Status, Notes
        const parsedAccounts: any[] = [];
        
        // Simple column mapper (assumes order: Name, PAN, Bank, AccountNumber, UPI, Phone, Status, Notes)
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",").map(c => c.replace(/^["']|["']$/g, "").trim());
          if (cols.length < 6) continue; // skip incomplete rows

          parsedAccounts.push({
            accountName: cols[0],
            panNumber: cols[1],
            bankName: cols[2],
            accountNumber: cols[3],
            upiId: cols[4],
            phoneNumber: cols[5],
            status: cols[6]?.toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE",
            notes: cols[7] || ""
          });
        }

        if (parsedAccounts.length === 0) {
          throw new Error("No valid rows were parsed from the CSV file.");
        }

        // Send to backend bulk API
        const response = await fetch("/api/accounts/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accounts: parsedAccounts })
        });

        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || "Bulk import failed");
        }

        setImportResult({
          successCount: json.successCount,
          skipCount: json.skipCount,
          errors: json.errors
        });
        
        fetchAccounts();
      } catch (err: any) {
        alert(err.message || "Failed to parse and upload CSV");
      } finally {
        setImporting(false);
        // Clear input file
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Registered Application Accounts</h2>
          <p className="text-sm text-muted">Manage the account records and track their cumulative profitability.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-input transition-all duration-200"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Import CSV</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/10 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div className="relative col-span-2">
          <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by Account Name or PAN..."
            value={search}
            onChange={handleSearchChange}
            className="w-full rounded-xl border border-border bg-card py-2 pr-4 pl-10 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <AlertCircle className="h-12 w-12 text-destructive animate-pulse" />
            <h4 className="mt-4 text-lg font-bold text-foreground">Could not load accounts</h4>
            <p className="mt-1 text-sm text-muted">{error}</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <Users className="h-12 w-12 text-muted" />
            <h4 className="mt-4 text-lg font-bold text-foreground">No accounts found</h4>
            <p className="mt-1 text-sm text-muted">Try adjusting filters or add a new account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Account Name</th>
                  <th className="px-6 py-4">PAN Number</th>
                  <th className="px-6 py-4">Bank Name</th>
                  <th className="px-6 py-4">UPI ID</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Total Apps</th>
                  <th className="px-6 py-4 text-right">Total Net Profit</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-input/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{account.accountName}</td>
                    <td className="px-6 py-4 font-mono">{account.panNumber}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{account.bankName}</p>
                        <p className="text-xs text-muted font-mono">{account.accountNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted">{account.upiId}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          account.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {account.status.charAt(0) + account.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold">{account.totalApplications}</td>
                    <td
                      className={`px-6 py-4 text-right font-bold ${
                        account.totalProfit >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(account.totalProfit)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(account)}
                          title="Edit Account"
                          className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id, account.accountName)}
                          title="Delete Account"
                          className="rounded-lg p-1.5 text-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Panel */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-input/20">
            <span className="text-xs text-muted">
              Showing page <strong className="text-foreground">{page}</strong> of{" "}
              <strong className="text-foreground">{totalPages}</strong> ({totalCount} total accounts)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="flex items-center justify-center rounded-lg border border-border bg-card p-1.5 hover:bg-input disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="flex items-center justify-center rounded-lg border border-border bg-card p-1.5 hover:bg-input disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD / EDIT ACCOUNT MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">
                {modalMode === "add" ? "Register New Account" : "Edit Account Registry"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-input hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-sm text-destructive font-medium">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Grid 2-cols */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    placeholder="e.g. Anuj Meena"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">PAN Card Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.panNumber}
                    onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABCDE1234F"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Bank Account Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. 5010023456789"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">UPI ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. anuj@okhdfcbank"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Phone Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, "") })}
                    placeholder="e.g. 9876543210"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">Notes / Remarks</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional description or login details..."
                  rows={2}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-input transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 transition-colors"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{modalMode === "add" ? "Create Account" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT DIALOG */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-success" />
                <span>Bulk Import Accounts via CSV</span>
              </h3>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportResult(null);
                }}
                className="rounded-lg p-1 text-muted hover:bg-input hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {!importResult ? (
                <>
                  <p className="text-sm text-muted leading-relaxed">
                    Upload a CSV file containing account information. The file must contain a header row. 
                    The columns should be in the following exact order:
                  </p>
                  <div className="rounded-xl bg-input/50 p-3 font-mono text-[10px] text-muted overflow-x-auto whitespace-nowrap">
                    Account Name, PAN, Bank, Account Number, UPI, Phone, Status, Notes
                  </div>

                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center hover:border-primary transition-colors bg-input/20">
                    {importing ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-sm font-semibold">Processing CSV data & writing to DB...</span>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload className="h-10 w-10 text-muted" />
                        <span className="text-sm font-semibold text-primary">Click to select CSV File</span>
                        <span className="text-xs text-muted">Supports standard .csv file formats</span>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleCsvImport}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 p-4 text-emerald-500">
                    <CheckCircle className="h-6 w-6 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">Bulk Import Completed!</h4>
                      <p className="text-xs mt-0.5 font-medium">
                        Successfully inserted <strong>{importResult.successCount}</strong> accounts. 
                        Skipped <strong>{importResult.skipCount}</strong> accounts.
                      </p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted">Skip Details & Errors:</p>
                      <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-input/50 p-3 text-xs text-muted font-mono space-y-1">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="flex gap-2 text-destructive">
                            <span>•</span>
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setIsImportModalOpen(false);
                        setImportResult(null);
                      }}
                      className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
                    >
                      Close Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
