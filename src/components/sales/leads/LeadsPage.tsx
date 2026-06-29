import { Link, useNavigate } from "@/lib/router-compat";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Filter,
  Flame,
  Hourglass,
  LayoutGrid,
  List,
  MoreVertical,
  Phone,
  Plus,
  Power,
  PowerOff,
  Search as SearchIcon,
  SearchX,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  UserCog,
  Users,
  Tag,
  Flag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sales/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { Leads, SalesUsers } from "@/lib/sales-api";
import {
  STATUS_META,
  getStatusMeta,
  getCourseMeta,
  avatarFor,
  formatPhone,
  followUpLabel,
  relativeTime,
  scoreTier,
  stageAge,
  type Lead,
} from "@/lib/leads";
import { hasPermission } from "@/lib/sales-permissions";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { useSalesSources } from "@/contexts/SalesSourcesContext";
import { cn } from "@/lib/utils";
import { AddLeadModal } from "./AddLeadModal";
import { ImportLeadsDialog } from "./ImportLeadsDialog";
import { BulkActionsDialog, type BulkMode } from "./BulkActionsDialog";
import {
  EMPTY_FILTERS,
  FilterDrawer,
  countActiveFilters,
  type LeadFilters,
} from "./FilterDrawer";

const PAGE_SIZE = 25;

type SortKey = "full_name" | "status" | "follow_up_date" | "last_activity_at" | "lead_score";

export function LeadsPage() {
  const { salesUser } = useSalesAuth();
  const { statuses } = useSalesStatuses();
  const { active: activeCourses, fieldsFor } = useSalesCourses();
  const { active: activeSources, getMeta: getSourceMeta } = useSalesSources();
  const isAdmin = salesUser?.role === "admin";
  const canCreate = hasPermission(salesUser, "leads.create");
  const canDelete = hasPermission(salesUser, "leads.delete");
  const canEdit = hasPermission(salesUser, "leads.edit");
  const canReassign = hasPermission(salesUser, "leads.reassign");
  const canBulk = hasPermission(salesUser, "leads.bulk");
  const canImport = hasPermission(salesUser, "import.csv");
  const canExport = hasPermission(salesUser, "export.data");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [reps, setReps] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("last_activity_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [followUpBucket, setFollowUpBucket] = useState<"all" | "today" | "upcoming" | "overdue" | "none">("all");
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [bulkMode, setBulkMode] = useState<BulkMode>(null);

  // Initial load
  useEffect(() => {
    void loadLeads();
    void loadReps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const all: Lead[] = [];
      const PER = 500;
      let page = 1;
      while (all.length < 5000) {
        const res = await Leads.list({ sort: "created_at", direction: "desc", per_page: PER, page });
        const chunk = (res.data ?? []) as unknown as Lead[];
        if (chunk.length === 0) break;
        all.push(...chunk);
        if (chunk.length < PER) break;
        page++;
      }
      setLeads(all);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  const loadReps = async () => {
    try {
      const res = await SalesUsers.list({ active_only: true });
      const list = (res.data ?? []) as unknown as { id: string; full_name: string }[];
      setReps(list.map((r) => ({ id: r.id, full_name: r.full_name })));
    } catch {
      setReps([]);
    }
  };

  // Filter + search + sort
  const filtered = useMemo(() => {
    let list = [...leads];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.phone.includes(search.trim()),
      );
    }
    if (filters.statuses.length)
      list = list.filter((l) => filters.statuses.includes(l.status));
    if (filters.sources.length)
      list = list.filter((l) => filters.sources.includes(l.source));
    if (filters.priorities.length)
      list = list.filter((l) => filters.priorities.includes(l.priority));
    if (filters.courses.length)
      list = list.filter((l) =>
        l.courses.some((c) => filters.courses.includes(c)),
      );
    if (filters.assignedTo === "unassigned")
      list = list.filter((l) => !l.assigned_to);
    else if (filters.assignedTo !== "all")
      list = list.filter((l) => l.assigned_to === filters.assignedTo);
    if (filters.dateFrom || filters.dateTo) {
      const key = filters.dateMode === "added" ? "created_at" : "follow_up_date";
      list = list.filter((l) => {
        const v = l[key];
        if (!v) return false;
        const t = new Date(v).getTime();
        if (filters.dateFrom && t < new Date(filters.dateFrom).getTime())
          return false;
        if (filters.dateTo && t > new Date(filters.dateTo).getTime() + 86400000)
          return false;
        return true;
      });
    }

    // Follow-up bucket sub-filter (only meaningful when sorting by follow-up)
    if (sortKey === "follow_up_date" && followUpBucket !== "all") {
      const now = Date.now();
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const endToday = startToday.getTime() + 86400000;
      list = list.filter((l) => {
        if (!l.follow_up_date) return followUpBucket === "none";
        if (followUpBucket === "none") return false;
        const t = new Date(l.follow_up_date).getTime();
        if (followUpBucket === "today") return t >= startToday.getTime() && t < endToday;
        if (followUpBucket === "overdue") return t < now;
        if (followUpBucket === "upcoming") return t >= now;
        return true;
      });
    }

    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [leads, search, filters, sortKey, sortDir, followUpBucket]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const toggleRow = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === pageRows.length) setSelected(new Set());
    else setSelected(new Set(pageRows.map((r) => r.id)));
  };

  const removeFilterChip = (key: keyof LeadFilters, value?: string) => {
    setFilters((f) => {
      if (Array.isArray(f[key]) && value) {
        return { ...f, [key]: (f[key] as string[]).filter((v) => v !== value) };
      }
      return { ...f, [key]: EMPTY_FILTERS[key] };
    });
  };

  const bulkDelete = async () => {
    if (!canDelete) return;
    if (!confirm(`Delete ${selected.size} lead(s)?`)) return;
    const ids = Array.from(selected);
    const results = await Promise.allSettled(ids.map((id) => Leads.remove(id)));
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === ids.length) {
      toast.error("Failed to delete");
      return;
    }
    if (failed > 0) toast.error(`${failed} delete${failed > 1 ? "s" : ""} failed`);
    toast.success(`${ids.length - failed} lead${ids.length - failed !== 1 ? "s" : ""} deleted`);
    setLeads((all) => all.filter((l) => !selected.has(l.id)));
    setSelected(new Set());
  };

  const exportCsv = () => {
    const rows = filtered.map((l) => ({
      Name: l.full_name,
      Phone: l.phone,
      Email: l.email ?? "",
      Source: l.source,
      Status: l.status,
      Priority: l.priority,
      Courses: l.courses.join("|"),
      City: l.city ?? "",
      Created: l.created_at,
    }));
    const headers = Object.keys(rows[0] ?? { Name: "" });
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const moveLeadToStatus = async (leadId: string, nextStatus: string) => {
    if (!canEdit) {
      toast.error("You do not have permission to edit leads");
      return;
    }

    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === nextStatus) return;

    const prevStatus = lead.status;
    const nextLabel = getStatusMeta(nextStatus, statuses).label;
    setLeads((all) =>
      all.map((item) =>
        item.id === leadId
          ? { ...item, status: nextStatus, status_changed_at: new Date().toISOString(), last_activity_at: new Date().toISOString() }
          : item,
      ),
    );

    try {
      const updated = await Leads.update(leadId, { status: nextStatus });
      setLeads((all) => all.map((item) => (item.id === leadId ? (updated as unknown as Lead) : item)));
      toast.success(`Moved to ${nextLabel}`);
    } catch (e) {
      setLeads((all) =>
        all.map((item) =>
          item.id === leadId
            ? { ...item, status: prevStatus, status_changed_at: lead.status_changed_at, last_activity_at: lead.last_activity_at }
            : item,
        ),
      );
      toast.error(e instanceof Error ? e.message : "Failed to move lead");
    }
  };

  const activeChips: { key: keyof LeadFilters; value?: string; label: string }[] =
    [];
  filters.statuses.forEach((s) =>
    activeChips.push({ key: "statuses", value: s, label: getStatusMeta(s, statuses).label }),
  );
  filters.courses.forEach((c) =>
    activeChips.push({ key: "courses", value: c, label: getCourseMeta(c, activeCourses).label }),
  );
  filters.sources.forEach((s) =>
    activeChips.push({ key: "sources", value: s, label: getSourceMeta(s).label }),
  );
  filters.priorities.forEach((p) =>
    activeChips.push({ key: "priorities", value: p, label: p.toUpperCase() }),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Premium header card */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60 p-5 shadow-xl shadow-blue-100/40">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-blue-200/40 to-indigo-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-violet-200/30 to-pink-200/20 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">All Leads</h1>
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-blue-700">{filtered.length}</span> total
                {countActiveFilters(filters) > 0 && ` · ${countActiveFilters(filters)} filter${countActiveFilters(filters) > 1 ? "s" : ""} active`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="w-full sm:w-[280px] pl-9 bg-white/80 backdrop-blur border-blue-100 focus-visible:ring-blue-500/30"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setDrawerOpen(true)}
              className="relative bg-white/80 backdrop-blur border-blue-100 hover:bg-blue-50"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {countActiveFilters(filters) > 0 && (
                <span className="ml-2 rounded-full bg-primary px-1.5 text-xs font-bold text-primary-foreground">
                  {countActiveFilters(filters)}
                </span>
              )}
            </Button>
            {canCreate && (
              <Button
                onClick={() => setAddOpen(true)}
                className="hidden md:inline-flex bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            )}
            {canImport && (
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="hidden md:inline-flex bg-white/80 backdrop-blur border-blue-100 hover:bg-blue-50"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
            )}
            {canExport && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden md:inline-flex bg-white/80 backdrop-blur border-blue-100 hover:bg-blue-50">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportCsv}>CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Excel export coming soon")}>
                    Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {activeChips.map((c, i) => (
              <button
                key={i}
                onClick={() => removeFilterChip(c.key, c.value)}
                className="flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100 backdrop-blur transition hover:bg-blue-50 hover:shadow-md"
              >
                {c.label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick stat KPIs */}
      <QuickStatsRow leads={leads} statuses={statuses} />

      {/* View toggle + status pill row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filtered.length}</span> of {leads.length} leads
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 shadow-sm">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
              viewMode === "table" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" /> Table
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition",
              viewMode === "kanban" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Kanban
          </button>
        </div>
      </div>

      {/* Status filter pill bar */}
      <StatusPillBar
        leads={leads}
        statuses={statuses}
        activeStatuses={filters.statuses}
        onSelect={(key) => {
          setPage(1);
          setFilters((f) => {
            if (key === null) return { ...f, statuses: [] };
            // toggle: if it's the only one active, clear; else set to just this
            if (f.statuses.length === 1 && f.statuses[0] === key) return { ...f, statuses: [] };
            return { ...f, statuses: [key] };
          });
        }}
      />

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4 py-3"
          >
            <span className="text-sm font-bold">
              {selected.size} lead{selected.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex flex-wrap gap-2">
              {canReassign && canBulk && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkMode("reassign")}
                >
                  <UserCog className="mr-1 h-3.5 w-3.5" />
                  Reassign
                </Button>
              )}
              {canEdit && canBulk && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkMode("status")}
                >
                  <Tag className="mr-1 h-3.5 w-3.5" />
                  Change Status
                </Button>
              )}
              {canEdit && canBulk && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBulkMode("priority")}
                >
                  <Flag className="mr-1 h-3.5 w-3.5" />
                  Change Priority
                </Button>
              )}
              {canExport && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const rows = filtered.filter((l) => selected.has(l.id)).map((l) => ({
                      Name: l.full_name, Phone: l.phone, Email: l.email ?? "",
                      Source: l.source, Status: l.status, Priority: l.priority,
                      Courses: l.courses.join("|"), City: l.city ?? "", Created: l.created_at,
                    }));
                    if (rows.length === 0) return;
                    const headers = Object.keys(rows[0]);
                    const csv = [headers.join(","), ...rows.map((r) =>
                      headers.map((h) => `"${String((r as any)[h]).replace(/"/g, '""')}"`).join(","),
                    )].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `leads-selected-${new Date().toISOString().slice(0,10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Export
                </Button>
              )}
              {canDelete && canBulk && (
                <Button size="sm" variant="destructive" onClick={bulkDelete}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow-up sub-filter chips (visible when sorting by follow-up) */}
      {sortKey === "follow_up_date" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Follow-up:</span>
          {([
            { k: "all", label: "All" },
            { k: "today", label: "Today" },
            { k: "upcoming", label: "Upcoming" },
            { k: "overdue", label: "Overdue" },
            { k: "none", label: "Not scheduled" },
          ] as const).map((b) => {
            const active = followUpBucket === b.k;
            return (
              <button
                key={b.k}
                onClick={() => {
                  setFollowUpBucket(b.k);
                  setPage(1);
                }}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {b.label}
              </button>
            );
          })}
        </div>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && !loading && (
        <KanbanView
          leads={filtered}
          statuses={statuses}
          repsById={Object.fromEntries(reps.map((r) => [r.id, r.full_name]))}
          canEdit={canEdit}
          onMoveLead={moveLeadToStatus}
        />
      )}

      {/* Mobile cards (table view only) */}
      {viewMode === "table" && (
      <>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : pageRows.length === 0 ? (
          <LeadsEmptyState
            hasFilters={countActiveFilters(filters) > 0 || !!search.trim()}
            onAdd={() => setAddOpen(true)}
            onClearFilters={() => {
              setFilters(EMPTY_FILTERS);
              setSearch("");
            }}
          />
        ) : (
          pageRows.map((l) => <MobileLeadCard key={l.id} lead={l} />)
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-blue-100 bg-card shadow-lg shadow-blue-100/30 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 text-xs uppercase tracking-wider text-slate-600">
              <tr>
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={
                      pageRows.length > 0 && selected.size === pageRows.length
                    }
                    onCheckedChange={toggleAll}
                  />
                </th>
                <Th onClick={() => toggleSort("full_name")}>Lead</Th>
                <th className="px-3 py-3 text-left font-semibold">Phone</th>
                <th className="px-3 py-3 text-left font-semibold">Source</th>
                <th className="px-3 py-3 text-left font-semibold">Course</th>
                <Th onClick={() => toggleSort("status")}>Status</Th>
                <Th onClick={() => toggleSort("lead_score")}>Score</Th>
                <Th onClick={() => toggleSort("follow_up_date")}>Follow-up</Th>
                <th className="px-3 py-3 text-left font-semibold">Assigned</th>
                <Th onClick={() => toggleSort("last_activity_at")}>
                  Last Activity
                </Th>
                <th className="w-24 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center">
                    Loading…
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-3 py-12">
                    <LeadsEmptyState
                      hasFilters={countActiveFilters(filters) > 0 || !!search.trim()}
                      onAdd={() => setAddOpen(true)}
                      onClearFilters={() => {
                        setFilters(EMPTY_FILTERS);
                        setSearch("");
                      }}
                    />
                  </td>
                </tr>
              ) : (
                pageRows.map((l, idx) => (
                  <LeadRow
                    key={l.id}
                    lead={l}
                    index={idx}
                    selected={selected.has(l.id)}
                    onToggle={() => toggleRow(l.id)}
                    isAdmin={isAdmin}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canReassign={canReassign}
                    onEdit={() => setEditingLead(l)}
                    onUpdated={(patch) => {
                      setLeads((all) =>
                        all.map((item) => (item.id === l.id ? { ...item, ...patch } : item)),
                      );
                    }}
                    repName={
                      reps.find((r) => r.id === l.assigned_to)?.full_name ?? "—"
                    }
                    flash={l.id === justAddedId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Pagination */}
      {viewMode === "table" && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {Array.from({ length: totalPages }).slice(0, 7).map((_, i) => {
            const p = i + 1;
            return (
              <Button
                key={p}
                variant={p === page ? "default" : "ghost"}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Mobile FAB — Add Lead */}
      {canCreate && (
        <button
          onClick={() => setAddOpen(true)}
          aria-label="Add Lead"
          className="sales-fab md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onChange={setFilters}
        isAdmin={isAdmin}
        reps={reps}
      />

      <AddLeadModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        isAdmin={isAdmin}
        currentUserId={salesUser?.id ?? ""}
        reps={reps}
        onCreated={(lead) => {
          setLeads((all) => [lead, ...all]);
          setJustAddedId(lead.id);
          setTimeout(() => setJustAddedId(null), 2500);
        }}
      />
      <AddLeadModal
        open={editingLead !== null}
        onClose={() => setEditingLead(null)}
        lead={editingLead}
        isAdmin={isAdmin}
        currentUserId={salesUser?.id ?? ""}
        reps={reps}
        onUpdated={(lead) => {
          setLeads((all) => all.map((item) => (item.id === lead.id ? lead : item)));
          setEditingLead(null);
        }}
      />
      <ImportLeadsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void loadLeads()}
        sourcesValid={activeSources.map((s) => s.key)}
        statusesValid={statuses.map((s) => s.key)}
        coursesValid={activeCourses.map((c) => c.key)}
      />
      <BulkActionsDialog
        mode={bulkMode}
        onClose={() => setBulkMode(null)}
        selectedIds={Array.from(selected)}
        reps={reps}
        onApplied={(patch) => {
          setLeads((all) =>
            all.map((l) => (selected.has(l.id) ? { ...l, ...patch } as Lead : l)),
          );
          setSelected(new Set());
        }}
      />
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      className="cursor-pointer px-3 py-3 text-left font-semibold hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </th>
  );
}

function LeadRow({
  lead,
  index,
  selected,
  onToggle,
  isAdmin,
  canEdit,
  canDelete,
  canReassign,
  onEdit,
  onUpdated,
  repName,
  flash,
}: {
  lead: Lead;
  index: number;
  selected: boolean;
  onToggle: () => void;
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReassign: boolean;
  onEdit: () => void;
  onUpdated: (patch: Partial<Lead>) => void;
  repName: string;
  flash: boolean;
}) {
  const { statuses } = useSalesStatuses();
  const { getMeta: getSourceMeta } = useSalesSources();
  const av = avatarFor(lead.full_name);
  const sm = getStatusMeta(lead.status, statuses);
  const sa = stageAge(lead.status_changed_at);
  const fu = followUpLabel(lead.follow_up_date);
  const navigate = useNavigate();
  const toggleActive = async () => {
    const next = !lead.is_active;
    try {
      const updated = await Leads.update(lead.id, { is_active: next });
      onUpdated(updated as unknown as Lead);
      toast.success(next ? "Lead activated" : "Lead marked inactive");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: flash ? "rgba(16,185,129,0.12)" : "transparent",
      }}
      transition={{ delay: index * 0.025, duration: 0.3, ease: "easeOut" }}
      whileHover={{ scale: 1.002 }}
      className={cn(
        "group cursor-pointer border-t border-border/60 transition-all duration-200",
        "hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30",
        "hover:[box-shadow:inset_3px_0_0_#3B82F6,0_4px_12px_-4px_rgba(59,130,246,0.15)]",
      )}
      onClick={(e) => {
        const t = e.target as HTMLElement;
        if (t.closest("button,input,a,[role=menuitem]")) return;
        navigate({ to: "/sales/leads/$id", params: { id: lead.id } });
      }}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-white transition-transform group-hover:scale-110",
              av.color,
            )}
          >
            {av.initials}
          </div>
          <span className="font-bold text-foreground group-hover:text-blue-700 transition-colors">{lead.full_name}</span>
          {isAdmin && !lead.is_active && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
              Inactive
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-3">
        <a
          href={`tel:${formatPhone(lead.phone)}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-foreground hover:text-primary"
        >
          <Phone className="h-3.5 w-3.5" />
          {formatPhone(lead.phone)}
        </a>
      </td>
      <td className="px-3 py-3">
        {(() => {
          const meta = getSourceMeta(lead.source);
          const Icon = meta.icon;
          return (
            <span className="flex items-center gap-1.5">
              <Icon className={cn("h-4 w-4", meta.color)} />
              <span className="text-xs">{meta.label}</span>
            </span>
          );
        })()}
      </td>
      <td className="px-3 py-3">
        <CourseChips courseKeys={lead.courses} />
      </td>
      <td className="px-3 py-3">
        <div className="flex flex-col items-start gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              sm.bg,
              sm.text,
            )}
          >
            {sm.dot && <span className="sales-pulse-dot" />}
            {sm.label}
          </span>
          <span
            title={sa.label}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
              sa.bg, sa.text, sa.ring,
            )}
          >
            <Hourglass className="h-2.5 w-2.5" />
            {sa.shortLabel}
          </span>
        </div>
      </td>
      <td className="px-3 py-3">
        {(() => {
          const t = scoreTier(lead.lead_score ?? 0);
          return (
            <span
              title={`Engagement ${lead.score_breakdown?.engagement ?? 0} · Recency ${lead.score_breakdown?.recency ?? 0} · Response ${lead.score_breakdown?.response_time ?? 0} · Status ${lead.score_breakdown?.status ?? 0} · Priority ${lead.score_breakdown?.priority ?? 0} · Profile ${lead.score_breakdown?.completeness ?? 0}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                t.bg, t.text, t.ring,
              )}
            >
              {lead.lead_score ?? 0}
              <span className="text-[9px] font-semibold opacity-70">{t.label}</span>
            </span>
          );
        })()}
      </td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "text-xs font-semibold",
            fu.overdue ? "flex items-center gap-1 text-rose-600" : "text-foreground",
          )}
        >
          {fu.overdue && <span className="sales-pulse-dot text-rose-500" />}
          {fu.label}
        </span>
      </td>
      <td className="px-3 py-3">
        {!lead.assigned_to ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-300">
            <span className="sales-pulse-dot bg-emerald-500" />
            Available
          </span>
        ) : isAdmin ? (
          <span className="text-xs text-muted-foreground">{repName}</span>
        ) : (
          <span className="text-xs text-muted-foreground">You</span>
        )}
      </td>
      <td className="px-3 py-3">
        <span className="text-xs text-muted-foreground">
          {relativeTime(lead.last_activity_at)}
        </span>
      </td>
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <a
            href={`tel:${formatPhone(lead.phone)}`}
            className="rounded-md p-1.5 hover:bg-accent"
            title="Call"
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
          <button
            className="rounded-md p-1.5 hover:bg-accent"
            title="Note"
            onClick={() => toast.info("Note modal coming soon")}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1.5 hover:bg-accent">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  Edit
                </DropdownMenuItem>
              )}
              {canReassign && (
                <DropdownMenuItem onClick={() => toast.info("Reassign coming soon")}>
                  Reassign
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem onClick={toggleActive}>
                  {lead.is_active ? (
                    <>
                      <PowerOff className="mr-2 h-3.5 w-3.5" />
                      Mark inactive
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 h-3.5 w-3.5" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  className="text-rose-600 focus:text-rose-600"
                  onClick={async () => {
                    if (!confirm(`Delete ${lead.full_name}?`)) return;
                    try {
                      await Leads.remove(lead.id);
                      toast.success("Lead deleted");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  Delete
                </DropdownMenuItem>
              )}
              {!canEdit && !canReassign && !canDelete && (
                <DropdownMenuItem disabled>No actions available</DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
}

function MobileLeadCard({ lead }: { lead: Lead }) {
  const { statuses } = useSalesStatuses();
  const av = avatarFor(lead.full_name);
  const sm = getStatusMeta(lead.status, statuses);
  const sa = stageAge(lead.status_changed_at);
  const fu = followUpLabel(lead.follow_up_date);
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 p-4 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-100/50 active:scale-[0.99]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-blue-100/40 to-indigo-100/30 blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-white",
              av.color,
            )}
          >
            {av.initials}
          </div>
          <div>
            <p className="font-bold">{lead.full_name}</p>
            <a
              href={`tel:${formatPhone(lead.phone)}`}
              className="text-xs text-muted-foreground"
            >
              {formatPhone(lead.phone)}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              sm.bg,
              sm.text,
            )}
          >
            {sm.label}
          </span>
          <span
            title={sa.label}
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1",
              sa.bg, sa.text, sa.ring,
            )}
          >
            <Hourglass className="h-2 w-2" />
            {sa.shortLabel}
          </span>
        </div>
      </div>
      {!lead.assigned_to && (
        <div className="mt-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-300">
            <span className="sales-pulse-dot bg-emerald-500" />
            Available
          </span>
        </div>
      )}
      <div className="mt-3"><CourseChips courseKeys={lead.courses} /></div>
      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            "text-xs",
            fu.overdue ? "font-semibold text-rose-600" : "text-muted-foreground",
          )}
        >
          {fu.label}
        </span>
        <a
          href={`tel:${formatPhone(lead.phone)}`}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Phone className="h-3 w-3" />
          Call
        </a>
      </div>
    </div>
  );
}

function LeadsEmptyState({
  hasFilters,
  onAdd,
  onClearFilters,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <EmptyState
        variant="default"
        icon={SearchX}
        title="No leads match your filters"
        description="Try adjusting or clearing your filters to see more results."
        action={
          <Button variant="outline" onClick={onClearFilters}>
            Clear Filters
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      variant="default"
      icon={ClipboardList}
      title="No leads yet"
      description="Add your first lead or import from CSV to get started."
      action={
        <>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("CSV import coming soon")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
        </>
      }
    />
  );
}

function CourseChips({ courseKeys }: { courseKeys: string[] }) {
  const { active } = useSalesCourses();
  return (
    <div className="flex flex-wrap gap-1">
      {courseKeys.map((c) => {
        const m = getCourseMeta(c, active);
        return (
          <span key={c} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", m.bg, m.text)}>
            {m.label}
          </span>
        );
      })}
    </div>
  );
}

/* ============ STATUS PILL BAR ============ */
function StatusPillBar({
  leads,
  statuses,
  activeStatuses,
  onSelect,
}: {
  leads: Lead[];
  statuses: ReturnType<typeof useSalesStatuses>["statuses"];
  activeStatuses: string[];
  onSelect: (key: string | null) => void;
}) {
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of leads) m[l.status] = (m[l.status] ?? 0) + 1;
    return m;
  }, [leads]);
  const allActive = activeStatuses.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-4 rounded-2xl border border-border bg-card px-3 pb-3 pt-5 shadow-sm">
      <PillWithBadge
        label="All"
        count={leads.length}
        active={allActive}
        onClick={() => onSelect(null)}
        activeClass="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
        inactiveClass="bg-muted text-foreground hover:bg-accent"
        badgeClass="bg-blue-600 text-white ring-card"
      />
      {statuses
        .filter((s) => s.is_active)
        .map((s) => {
          const meta = getStatusMeta(s.key, statuses);
          const active = activeStatuses.includes(s.key);
          const count = counts[s.key] ?? 0;
          const dotColor = meta.bg.replace("-100", "-500");
          return (
            <PillWithBadge
              key={s.key}
              label={meta.label}
              count={count}
              active={active}
              onClick={() => onSelect(s.key)}
              activeClass={cn(meta.bg, meta.text, "ring-1 ring-current shadow-md scale-[1.02]")}
              inactiveClass={cn("bg-card ring-1 ring-border hover:bg-accent", meta.text)}
              badgeClass={cn(dotColor, "text-white ring-card")}
            />
          );
        })}
    </div>
  );
}

function PillWithBadge({
  label,
  count,
  active,
  onClick,
  activeClass,
  inactiveClass,
  badgeClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
  badgeClass: string;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          "rounded-full px-4 py-1.5 text-xs font-bold transition",
          active ? activeClass : inactiveClass,
        )}
      >
        {label}
      </button>
      <span
        className={cn(
          "pointer-events-none absolute -right-1.5 -top-2 min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-extrabold leading-none shadow ring-2",
          badgeClass,
        )}
      >
        {count}
      </span>
    </div>
  );
}

/* ====================== QUICK STATS ROW ====================== */
function QuickStatsRow({
  leads,
  statuses,
}: {
  leads: Lead[];
  statuses: ReturnType<typeof useSalesStatuses>["statuses"];
}) {
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const now = Date.now();
    const wonKeys = new Set(statuses.filter((s) => s.is_won).map((s) => s.key));
    const newToday = leads.filter((l) => new Date(l.created_at) >= today).length;
    const hot = leads.filter((l) => l.status === "ready_for_class" || l.status === "follow_up").length;
    const overdue = leads.filter(
      (l) => l.follow_up_date && new Date(l.follow_up_date).getTime() < now && !wonKeys.has(l.status),
    ).length;
    const todayFu = leads.filter(
      (l) =>
        l.follow_up_date &&
        new Date(l.follow_up_date) >= today &&
        new Date(l.follow_up_date) < tomorrow,
    ).length;
    const unassigned = leads.filter((l) => !l.assigned_to).length;
    const stale = leads.filter((l) => {
      if (wonKeys.has(l.status)) return false;
      const t = l.status_changed_at ? new Date(l.status_changed_at).getTime() : Date.now();
      return (Date.now() - t) / 86_400_000 > 7;
    }).length;
    return { total: leads.length, newToday, hot, overdue, todayFu, unassigned, stale };
  }, [leads, statuses]);

  const items = [
    { icon: Users, label: "Total Leads", value: stats.total, gradient: "from-blue-500 to-indigo-600" },
    { icon: Sparkles, label: "New Today", value: stats.newToday, gradient: "from-emerald-500 to-teal-600" },
    { icon: Calendar, label: "Today's Follow-up", value: stats.todayFu, gradient: "from-cyan-500 to-blue-600" },
    { icon: Flame, label: "Hot Leads", value: stats.hot, gradient: "from-orange-500 to-rose-600" },
    { icon: AlertTriangle, label: "Overdue", value: stats.overdue, gradient: "from-rose-500 to-red-600" },
    { icon: Hourglass, label: "Stale Stage (>7d)", value: stats.stale, gradient: "from-amber-500 to-orange-600" },
    { icon: Users, label: "Unassigned", value: stats.unassigned, gradient: "from-violet-500 to-purple-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={cn(
              "relative overflow-hidden rounded-xl bg-gradient-to-br p-3 text-white shadow-sm",
              it.gradient,
            )}
          >
            <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-white/15 blur-xl" />
            <div className="relative flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold leading-none">{it.value}</div>
                <div className="truncate text-[10px] font-semibold uppercase text-white/85">{it.label}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ====================== KANBAN VIEW ====================== */
function KanbanView({
  leads,
  statuses,
  repsById,
  canEdit,
  onMoveLead,
}: {
  leads: Lead[];
  statuses: ReturnType<typeof useSalesStatuses>["statuses"];
  repsById: Record<string, string>;
  canEdit: boolean;
  onMoveLead: (leadId: string, nextStatus: string) => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const activeStatuses = statuses.filter((s) => s.is_active);
  const grouped = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    for (const s of activeStatuses) m[s.key] = [];
    for (const l of leads) {
      if (m[l.status]) m[l.status].push(l);
    }
    return m;
  }, [leads, activeStatuses]);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {activeStatuses.map((s) => {
          const meta = getStatusMeta(s.key, statuses);
          const items = grouped[s.key] ?? [];
          const dotColor = meta.bg.replace("-100", "-500");
          return (
            <div
              key={s.key}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropTarget(s.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDropTarget((current) => (current === s.key ? null : current));
                }
              }}
              onDrop={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                const leadId = e.dataTransfer.getData("text/plain");
                setDropTarget(null);
                setDraggingId(null);
                if (leadId) onMoveLead(leadId, s.key);
              }}
              className={cn(
                "flex w-[280px] flex-shrink-0 flex-col rounded-2xl border bg-muted/30 p-2 transition",
                dropTarget === s.key ? "border-blue-400 bg-blue-50/70 ring-2 ring-blue-200" : "border-border",
              )}
            >
              <div className="sticky top-0 z-10 mb-2 flex items-center justify-between rounded-xl bg-card px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", dotColor)} />
                  <span className="text-sm font-bold">{meta.label}</span>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-extrabold", meta.bg, meta.text)}>
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                    No leads
                  </div>
                )}
                {items.map((l) => (
                  <KanbanCard
                    key={l.id}
                    lead={l}
                    repName={repsById[l.assigned_to ?? ""] ?? "Unassigned"}
                    draggable={canEdit}
                    dragging={draggingId === l.id}
                    onDragStart={() => setDraggingId(l.id)}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDropTarget(null);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  lead,
  repName,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  repName: string;
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const av = avatarFor(lead.full_name);
  const sa = stageAge(lead.status_changed_at);
  const fu = lead.follow_up_date ? followUpLabel(lead.follow_up_date) : null;
  return (
    <Link
      to="/sales/leads/$id"
      params={{ id: lead.id }}
      draggable={draggable}
      onDragStart={(e) => {
        if (!draggable) return;
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "block rounded-xl border border-border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        draggable && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50 ring-2 ring-blue-300",
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-full text-xs font-extrabold text-white", av.color)}>
          {av.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{lead.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{formatPhone(lead.phone)}</div>
        </div>
        <span
          title={sa.label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
            sa.bg, sa.text, sa.ring,
          )}
        >
          <Hourglass className="h-2.5 w-2.5" />
          {sa.shortLabel}
        </span>
      </div>
      {lead.courses.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.courses.slice(0, 2).map((c) => {
            const cm = getCourseMeta(c);
            return (
              <span key={c} className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", cm.bg, cm.text)}>
                {cm.label}
              </span>
            );
          })}
          {lead.courses.length > 2 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold">
              +{lead.courses.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" /> {repName}
        </span>
        {fu && (
          <span className={cn(
            "inline-flex items-center gap-1 font-semibold",
            fu.overdue ? "text-rose-600" : fu.today ? "text-amber-600" : "",
          )}>
            <Calendar className="h-3 w-3" /> {fu.label}
          </span>
        )}
      </div>
    </Link>
  );
}
