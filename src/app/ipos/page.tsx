"use client";

import React, { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Loader2,
  AlertCircle,
  X,
  TrendingUp,
  Calendar,
  Briefcase
} from "lucide-react";

type Ipo = {
  id: string;
  ipoName: string;
  openDate: string;
  closeDate: string;
  listingDate: string;
  issuePrice: number;
  lotSize: number;
  status: "UPCOMING" | "OPEN" | "CLOSED" | "LISTED";
  externalId?: string | null;
  totalApplications: number;
  totalCapitalDeployed: number;
};

export default function IposPage() {
  const [ipos, setIpos] = useState<Ipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedIpoId, setSelectedIpoId] = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    ipoName: "",
    openDate: "",
    closeDate: "",
    listingDate: "",
    issuePrice: "",
    lotSize: "",
    status: "UPCOMING",
    externalId: ""
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch IPOs Function
  const fetchIpos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        search,
        status: statusFilter
      });

      const res = await fetch(`/api/ipos?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load IPO records");
      const json = await res.json();
      setIpos(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load IPO registry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIpos();
  }, [search, statusFilter]);

  // Open Add Modal
  const openAddModal = () => {
    // Default dates to today
    const today = new Date().toISOString().split("T")[0];
    setFormData({
      ipoName: "",
      openDate: today,
      closeDate: today,
      listingDate: today,
      issuePrice: "",
      lotSize: "",
      status: "UPCOMING",
      externalId: ""
    });
    setFormError(null);
    setModalMode("add");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (ipo: Ipo) => {
    setFormData({
      ipoName: ipo.ipoName,
      openDate: ipo.openDate.split("T")[0],
      closeDate: ipo.closeDate.split("T")[0],
      listingDate: ipo.listingDate.split("T")[0],
      issuePrice: ipo.issuePrice.toString(),
      lotSize: ipo.lotSize.toString(),
      status: ipo.status,
      externalId: ipo.externalId || ""
    });
    setSelectedIpoId(ipo.id);
    setFormError(null);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  // Handle Form Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const { ipoName, openDate, closeDate, listingDate, issuePrice, lotSize } = formData;
    if (!ipoName || !openDate || !closeDate || !listingDate || !issuePrice || !lotSize) {
      setFormError("All fields are required.");
      return;
    }

    if (parseFloat(issuePrice) <= 0 || parseInt(lotSize, 10) <= 0) {
      setFormError("Issue price and lot size must be positive values.");
      return;
    }

    try {
      setSubmitting(true);
      const url = modalMode === "add" ? "/api/ipos" : `/api/ipos/${selectedIpoId}`;
      const method = modalMode === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save IPO details");
      }

      setIsModalOpen(false);
      fetchIpos();
    } catch (err: any) {
      setFormError(err.message || "Failed to save IPO details");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete IPO
  const handleDeleteIpo = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This will cascade delete all applications logged under this IPO.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/ipos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete IPO");
      }
      fetchIpos();
    } catch (err: any) {
      alert(err.message || "Failed to delete IPO");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">IPO Registry</h2>
          <p className="text-sm text-muted">Add, track, and update listing state of corporate IPOs.</p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-md shadow-primary/10 transition-all duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Register IPO</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Search */}
        <div className="relative col-span-2">
          <Search className="absolute top-2.5 left-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by IPO Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-card py-2 pr-4 pl-10 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="LISTED">Listed</option>
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
            <h4 className="mt-4 text-lg font-bold text-foreground">Could not load IPO registry</h4>
            <p className="mt-1 text-sm text-muted">{error}</p>
          </div>
        ) : ipos.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center p-6">
            <Briefcase className="h-12 w-12 text-muted" />
            <h4 className="mt-4 text-lg font-bold text-foreground">No IPOs found</h4>
            <p className="mt-1 text-sm text-muted">Try adjusting filters or create a new IPO entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-border bg-input/50 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">IPO Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Open / Close Dates</th>
                  <th className="px-6 py-4 text-center">Listing Date</th>
                  <th className="px-6 py-4 text-right">Issue Price</th>
                  <th className="px-6 py-4 text-center">Lot Size</th>
                  <th className="px-6 py-4 text-center">Applications</th>
                  <th className="px-6 py-4 text-right">Capital Deployed</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ipos.map((ipo) => (
                  <tr key={ipo.id} className="hover:bg-input/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">{ipo.ipoName}</span>
                        {ipo.externalId && (
                          <span className="text-[10px] font-medium text-primary mt-0.5">
                            KFintech ID: {ipo.externalId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          ipo.status === "OPEN"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : ipo.status === "UPCOMING"
                            ? "bg-blue-500/10 text-blue-500"
                            : ipo.status === "CLOSED"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-purple-500/10 text-purple-500"
                        }`}
                      >
                        {ipo.status.charAt(0) + ipo.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="font-semibold text-foreground">{formatDate(ipo.openDate)}</span>
                        <span className="text-muted">to</span>
                        <span className="font-semibold text-foreground">{formatDate(ipo.closeDate)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-foreground">
                      {formatDate(ipo.listingDate)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold">
                      {formatCurrency(ipo.issuePrice)}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-medium">{ipo.lotSize} shares</td>
                    <td className="px-6 py-4 text-center font-bold text-foreground">
                      {ipo.totalApplications}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-primary">
                      {formatCurrency(ipo.totalCapitalDeployed)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEditModal(ipo)}
                          title="Edit IPO"
                          className="rounded-lg p-1.5 text-muted hover:bg-input hover:text-foreground transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIpo(ipo.id, ipo.ipoName)}
                          title="Delete IPO"
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
      </div>

      {/* ADD / EDIT IPO MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="text-lg font-bold text-foreground">
                {modalMode === "add" ? "Register New IPO" : "Edit IPO Registry"}
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

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-muted">IPO Name *</label>
                <input
                  type="text"
                  required
                  value={formData.ipoName}
                  onChange={(e) => setFormData({ ...formData, ipoName: e.target.value })}
                  placeholder="e.g. Swiggy Limited"
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Grid 3-cols for Dates */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Open Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.openDate}
                    onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Close Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.closeDate}
                    onChange={(e) => setFormData({ ...formData, closeDate: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Listing Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.listingDate}
                    onChange={(e) => setFormData({ ...formData, listingDate: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker()}
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Grid 2-cols for Price & Lots */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Issue Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.issuePrice}
                    onChange={(e) => setFormData({ ...formData, issuePrice: e.target.value })}
                    placeholder="e.g. 390"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Lot Size (Shares) *</label>
                  <input
                    type="number"
                    required
                    value={formData.lotSize}
                    onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                    placeholder="e.g. 38"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Grid 2-cols for Status & External ID */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted">Current IPO Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="UPCOMING">Upcoming</option>
                    <option value="OPEN">Open</option>
                    <option value="CLOSED">Closed</option>
                    <option value="LISTED">Listed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted flex items-center gap-1">
                    <span>External Registrar ID</span>
                    <span className="text-[10px] font-normal text-muted-foreground">(KFintech ID)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.externalId}
                    onChange={(e) => setFormData({ ...formData, externalId: e.target.value })}
                    placeholder="e.g. 82984397570"
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
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
                  <span>{modalMode === "add" ? "Create IPO" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
