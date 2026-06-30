import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users as UsersIcon,
  Tag,
  
  BellRing,
  Settings as Cog,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
  GripVertical,
  Shield,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Trophy,
  Target as TargetIcon,
  MessageCircle,
  History,
  Search,
} from "lucide-react";
import { STATUS_COLORS, type SalesStatus } from "@/lib/leads";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import { toast } from "sonner";
import {
  SalesUsers,
  Courses,
  LeadSources,
  Statuses,
  Targets,
  MessageTemplates,
  NotificationPrefs,
  SystemSettings,
  AuditLogs,
  RolePermissions,
  Leads,
  type SalesCourse,
  type SalesLeadSourceRow,
  type SalesStatusRow,
  type SalesTarget,
  type SalesMessageTemplate,
  type SalesSystemSettings,
  type SalesNotificationPref,
} from "@/lib/sales-api";
import { PERMISSION_GROUPS, type PermissionKey } from "@/lib/sales-permissions";

type TabKey = "users" | "roles" | "pipeline" | "sources" | "targets" | "templates" | "notifications" | "system" | "audit";

const TABS: { key: TabKey; label: string; icon: typeof UsersIcon }[] = [
  { key: "users", label: "Team Members", icon: UsersIcon },
  { key: "roles", label: "Role Permissions", icon: Shield },
  { key: "pipeline", label: "Pipeline / Funnel", icon: GitBranch },
  { key: "sources", label: "Lead Sources", icon: Tag },
  { key: "targets", label: "Sales Targets", icon: TargetIcon },
  { key: "templates", label: "WhatsApp Templates", icon: MessageCircle },
  { key: "notifications", label: "Notifications", icon: BellRing },
  { key: "audit", label: "Audit Log", icon: History },
  { key: "system", label: "System", icon: Cog },
];

export default function SettingsPage() {
  const { salesUser, loading } = useSalesAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("users");

  useEffect(() => {
    if (!loading && salesUser && salesUser.role !== "admin") navigate({ to: "/sales" });
  }, [loading, salesUser, navigate]);

  if (loading || !salesUser || salesUser.role !== "admin") return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-1 rounded-xl border border-border bg-card p-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </aside>

        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tab === "users" && <UsersTab />}
              {tab === "roles" && <RolePermissionsTab onSaved={() => { /* refresh handled in tab */ }} />}
              {tab === "pipeline" && <PipelineTab />}
              {tab === "sources" && <SourcesTab />}
              
              {tab === "targets" && <TargetsTab />}
              {tab === "templates" && <TemplatesTab />}
              {tab === "notifications" && <NotificationsTab />}
              {tab === "audit" && <AuditLogTab />}
              {tab === "system" && <SystemTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ============ USERS ============ */
interface SalesUserRow {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "executive";
  is_active: boolean;
  default_course_id: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  permissions: string[] | null;
}
interface CourseRow {
  id: string; name: string; short_code: string; color: string; is_active: boolean; sort_order: number;
  default_price: number; admission_fee: number; monthly_fee: number;
}

function UsersTab() {
  const [rows, setRows] = useState<SalesUserRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [open, setOpen] = useState<{ mode: "add" | "edit"; row?: SalesUserRow } | null>(null);
  const [permRow, setPermRow] = useState<SalesUserRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [u, c] = await Promise.all([
        SalesUsers.list(),
        Courses.list(),
      ]);
      setRows((u.data ?? []) as unknown as SalesUserRow[]);
      setCourses((c.data ?? []) as unknown as CourseRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (row: SalesUserRow) => {
    try {
      await SalesUsers.update(row.id, { is_active: !row.is_active });
      toast.success(row.is_active ? "Deactivated" : "Activated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update user");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Team Members</h2>
        <button
          onClick={() => setOpen({ mode: "add" })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{r.full_name}</td>
                  <td className="p-3 text-muted-foreground">{r.email}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      r.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {r.role === "admin" ? "Sales Admin" : r.role === "manager" ? "Sales Manager" : "Sales Executive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      r.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      {r.role === "executive" && (
                        <button
                          onClick={() => setPermRow(r)}
                          className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Shield className="mr-1 inline h-3 w-3" />
                          Permissions
                          <span className="ml-1 rounded-full bg-blue-200 px-1.5 text-[10px]">
                            {(r.permissions ?? []).length}
                          </span>
                        </button>
                      )}
                      <button onClick={() => setOpen({ mode: "edit", row: r })} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">
                        <Pencil className="inline h-3 w-3" /> Edit
                      </button>
                      <button onClick={() => toggleActive(r)} className={`rounded-md border px-2 py-1 text-xs ${
                        r.is_active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}>
                        {r.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {open && (
        <UserModal mode={open.mode} row={open.row} courses={courses} onClose={() => setOpen(null)} onSaved={load} />
      )}
      {permRow && (
        <PermissionsModal row={permRow} onClose={() => setPermRow(null)} onSaved={load} />
      )}
    </div>
  );
}

function PermissionsModal({ row, onClose, onSaved }: {
  row: SalesUserRow; onClose: () => void; onSaved: () => void;
}) {
  const [perms, setPerms] = useState<Set<string>>(new Set(row.permissions ?? []));
  const [saving, setSaving] = useState(false);

  const toggle = (k: PermissionKey) => {
    setPerms((p) => {
      const n = new Set(p);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });
  };

  const allKeys = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
  const allOn = allKeys.every((k) => perms.has(k));
  const toggleAll = () => {
    setPerms(allOn ? new Set() : new Set(allKeys));
  };

  const save = async () => {
    setSaving(true);
    try {
      await SalesUsers.update(row.id, { permissions: Array.from(perms) });
      toast.success("Permissions updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold">Permissions</h3>
              <p className="text-xs text-muted-foreground">{row.full_name} · {row.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2">
          <span className="text-xs font-semibold text-slate-700">
            {perms.size} of {allKeys.length} permissions enabled
          </span>
          <button
            onClick={toggleAll}
            className="rounded-md bg-white px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-200 hover:bg-blue-50"
          >
            {allOn ? "Clear all" : "Select all"}
          </button>
        </div>

        <div className="mt-4 space-y-5">
          {PERMISSION_GROUPS.map((g) => (
            <div key={g.title}>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">{g.title}</h4>
              <div className="mt-2 space-y-2">
                {g.items.map((p) => {
                  const on = perms.has(p.key);
                  return (
                    <label
                      key={p.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                        on
                          ? "border-blue-300 bg-blue-50/60 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(p.key)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-bold text-slate-900">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </div>
                      {on && <Check className="h-4 w-4 text-blue-600" />}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Permissions
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function UserModal({ mode, row, courses, onClose, onSaved }: {
  mode: "add" | "edit"; row?: SalesUserRow; courses: CourseRow[]; onClose: () => void; onSaved: () => void;
}) {
  const [full_name, setFullName] = useState(row?.full_name ?? "");
  const [email, setEmail] = useState(row?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "executive">(row?.role ?? "executive");
  const [defaultCourse, setDefaultCourse] = useState<string>(row?.default_course_id ?? "");
  const [whStart, setWhStart] = useState(row?.working_hours_start ?? "09:00");
  const [whEnd, setWhEnd] = useState(row?.working_hours_end ?? "18:00");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      if (mode === "add") {
        if (!password || password.length < 8) throw new Error("Password must be at least 8 characters");
        await SalesUsers.create({
          email,
          password,
          full_name,
          role,
          default_course_id: defaultCourse || null,
          working_hours_start: whStart || null,
          working_hours_end: whEnd || null,
        });
        toast.success("User created");
      } else if (row) {
        await SalesUsers.update(row.id, {
          full_name,
          role,
          default_course_id: defaultCourse || null,
          working_hours_start: whStart || null,
          working_hours_end: whEnd || null,
        });
        toast.success("User updated");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-card p-6 shadow-2xl"
      >
        <h3 className="text-lg font-extrabold">{mode === "add" ? "Add User" : "Edit User"}</h3>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="Full Name"><input value={full_name} onChange={(e) => setFullName(e.target.value)} className="input" /></Field>
          <Field label="Email"><input type="email" disabled={mode === "edit"} value={email} onChange={(e) => setEmail(e.target.value)} className="input disabled:opacity-60" /></Field>
          {mode === "add" && (
            <Field label="Initial Password" full>
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="input" />
            </Field>
          )}
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "executive")} className="input">
              <option value="executive">Sales Executive</option>
              <option value="manager">Sales Manager</option>
              <option value="admin">Sales Admin</option>
            </select>
          </Field>
          <Field label="Default Course">
            <select value={defaultCourse} onChange={(e) => setDefaultCourse(e.target.value)} className="input">
              <option value="">— none —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Working Hours Start"><input type="time" value={whStart} onChange={(e) => setWhStart(e.target.value)} className="input" /></Field>
          <Field label="Working Hours End"><input type="time" value={whEnd} onChange={(e) => setWhEnd(e.target.value)} className="input" /></Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={saving || !full_name || !email} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-xs font-semibold ${full ? "col-span-2" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

/* ============ SOURCES ============ */
interface SourceRow { id: string; name: string; icon: string; color: string; is_active: boolean; sort_order: number; }

function SourcesTab() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [color, setColor] = useState("#3B82F6");
  const load = async () => {
    try {
      const res = await LeadSources.list();
      setRows((res.data ?? []) as unknown as SourceRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load sources");
    }
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name.trim()) return;
    try {
      const key = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      await LeadSources.create({ key, name, color, sort_order: rows.length + 1 } as Partial<SalesLeadSourceRow>);
      setName(""); setColor("#3B82F6"); setAdding(false); load();
      toast.success("Source added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add source");
    }
  };
  const toggle = async (r: SourceRow) => {
    try {
      await LeadSources.update(r.id, { is_active: !r.is_active });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle source");
    }
  };
  const del = async (r: SourceRow) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    try {
      await LeadSources.remove(r.id);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete source");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Lead Sources</h2>
        <button onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Source
        </button>
      </div>
      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Source name" className="input flex-1 min-w-[200px]" />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
          <button onClick={add} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Check className="inline h-3.5 w-3.5" /></button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3">
            <span className="h-4 w-4 rounded-full" style={{ background: r.color }} />
            <span className="flex-1 font-semibold">{r.name}</span>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" checked={r.is_active} onChange={() => toggle(r)} className="h-4 w-4" />
              {r.is_active ? "Active" : "Inactive"}
            </label>
            <button onClick={() => del(r)} className="rounded-md border border-border p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ COURSES ============ */
export function CoursesTab() {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState(""); const [code, setCode] = useState(""); const [color, setColor] = useState("#3B82F6");
  const [admission, setAdmission] = useState("0");
  const [monthly, setMonthly] = useState("0");
  const [editingFees, setEditingFees] = useState<Record<string, { admission: string; monthly: string }>>({});
  const load = async () => {
    try {
      const res = await Courses.list();
      setRows((res.data ?? []) as unknown as CourseRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load courses");
    }
  };
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!name.trim() || !code.trim()) return;
    const a = Number(admission) || 0;
    const m = Number(monthly) || 0;
    try {
      const key = code.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      await Courses.create({
        name, key, short_code: code.toUpperCase(), color,
        sort_order: rows.length + 1,
        admission_fee: a, monthly_fee: m, default_price: a,
      } as Partial<SalesCourse>);
      setName(""); setCode(""); setColor("#3B82F6"); setAdmission("0"); setMonthly("0"); setAdding(false); load();
      toast.success("Course added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add course");
    }
  };
  const toggle = async (r: CourseRow) => {
    try { await Courses.update(r.id, { is_active: !r.is_active }); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to toggle course"); }
  };
  const del = async (r: CourseRow) => {
    if (!confirm(`Delete ${r.name}?`)) return;
    try { await Courses.remove(r.id); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed to delete course"); }
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir; if (j < 0 || j >= rows.length) return;
    const a = rows[idx], b = rows[j];
    try {
      await Promise.all([
        Courses.update(a.id, { sort_order: b.sort_order }),
        Courses.update(b.id, { sort_order: a.sort_order }),
      ]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  };
  const saveFees = async (r: CourseRow) => {
    const draft = editingFees[r.id];
    if (!draft) return;
    const a = Number(draft.admission) || 0;
    const m = Number(draft.monthly) || 0;
    try {
      await Courses.update(r.id, { admission_fee: a, monthly_fee: m, default_price: a });
      toast.success("Fees updated");
      setEditingFees((p) => { const n = { ...p }; delete n[r.id]; return n; });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update fees");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Courses</h2>
        <button onClick={() => setAdding((a) => !a)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>
      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border bg-card p-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name" className="input flex-1 min-w-[180px]" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CODE" className="input w-24" />
          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">Admission ৳
            <input type="number" value={admission} onChange={(e) => setAdmission(e.target.value)} className="input w-24" min={0} />
          </label>
          <label className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">Monthly ৳
            <input type="number" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="input w-24" min={0} />
          </label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border" />
          <button onClick={add} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Check className="inline h-3.5 w-3.5" /></button>
          <button onClick={() => setAdding(false)} className="rounded-lg border border-border px-3 py-1.5 text-xs"><X className="inline h-3.5 w-3.5" /></button>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map((r, i) => {
          const draft = editingFees[r.id];
          const isEditing = draft !== undefined;
          const setDraft = (patch: Partial<{ admission: string; monthly: string }>) =>
            setEditingFees((p) => {
              const cur = p[r.id] ?? { admission: String(r.admission_fee ?? 0), monthly: String(r.monthly_fee ?? 0) };
              return { ...p, [r.id]: { ...cur, ...patch } };
            });
          return (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex flex-col text-muted-foreground">
              <button onClick={() => move(i, -1)} className="leading-none hover:text-foreground">▲</button>
              <button onClick={() => move(i, 1)} className="leading-none hover:text-foreground">▼</button>
            </div>
            <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: r.color }}>{r.short_code}</span>
            <span className="flex-1 min-w-[140px] font-semibold">{r.name}</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Admission ৳</span>
              <input
                type="number"
                value={isEditing ? draft.admission : String(r.admission_fee ?? 0)}
                onChange={(e) => setDraft({ admission: e.target.value })}
                className="input w-20 py-1 text-sm"
                min={0}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Monthly ৳</span>
              <input
                type="number"
                value={isEditing ? draft.monthly : String(r.monthly_fee ?? 0)}
                onChange={(e) => setDraft({ monthly: e.target.value })}
                className="input w-20 py-1 text-sm"
                min={0}
              />
            </div>
            {isEditing && (
              <button onClick={() => saveFees(r)} className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"><Check className="inline h-3 w-3" /></button>
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
              <input type="checkbox" checked={r.is_active} onChange={() => toggle(r)} className="h-4 w-4" />
              {r.is_active ? "Active" : "Inactive"}
            </label>
            <button onClick={() => del(r)} className="rounded-md border border-border p-1.5 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ NOTIFICATIONS PREFS ============ */
const PREF_FIELDS = [
  { key: "follow_up_reminder_inapp", label: "Follow-up reminder (in-app)" },
  { key: "follow_up_reminder_email", label: "Follow-up reminder (email)" },
  { key: "overdue_alert", label: "Overdue follow-up alert" },
  { key: "new_lead_assigned", label: "New lead assigned to me" },
  { key: "csv_import_complete", label: "CSV import complete" },
  { key: "status_changed", label: "Lead status changed" },
] as const;

function NotificationsTab() {
  const { authUser } = useSalesAuth();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser) return;
    (async () => {
      try {
        const data = await NotificationPrefs.show();
        setPrefs(data as unknown as Record<string, boolean>);
      } catch {
        setPrefs({
          follow_up_reminder_inapp: true, follow_up_reminder_email: false,
          overdue_alert: true, new_lead_assigned: true, csv_import_complete: true, status_changed: false,
        });
      }
      setLoading(false);
    })();
  }, [authUser]);

  const save = async (next: Record<string, boolean>) => {
    if (!authUser) return;
    setPrefs(next);
    try {
      await NotificationPrefs.update(next as Partial<SalesNotificationPref>);
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save prefs");
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Notification Settings</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {PREF_FIELDS.map((f) => (
          <label key={f.key} className="flex cursor-pointer items-center justify-between p-4 hover:bg-muted/40">
            <span className="text-sm font-semibold">{f.label}</span>
            <button
              type="button"
              onClick={() => save({ ...prefs, [f.key]: !prefs[f.key] })}
              className={`relative h-6 w-11 rounded-full transition ${prefs[f.key] ? "bg-primary" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs[f.key] ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ============ SYSTEM ============ */
function SystemTab() {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [autoAssign, setAutoAssign] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await SystemSettings.show();
        if (data?.working_hours_start) setStart(data.working_hours_start.slice(0, 5));
        if (data?.working_hours_end) setEnd(data.working_hours_end.slice(0, 5));
        setAutoAssign(!!data?.auto_assign_round_robin);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await SystemSettings.update({
        working_hours_start: start,
        working_hours_end: end,
        auto_assign_round_robin: autoAssign,
      } as Partial<SalesSystemSettings>);
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">System Settings</h2>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div>
          <h3 className="text-sm font-bold">Business Hours</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Start"><input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="input" /></Field>
            <Field label="End"><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="input" /></Field>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <h3 className="text-sm font-bold">Auto-assignment</h3>
            <p className="text-xs text-muted-foreground">Round-robin assignment for new leads.</p>
          </div>
          <button onClick={() => setAutoAssign((a) => !a)} className={`relative h-6 w-11 rounded-full transition ${autoAssign ? "bg-primary" : "bg-muted"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${autoAssign ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
      </div>
      <button onClick={save} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
      </button>
    </div>
  );
}

/* ============ PIPELINE / FUNNEL ============ */
function PipelineTab() {
  const [rows, setRows] = useState<SalesStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<SalesStatus | null>(null);
  const [adding, setAdding] = useState(false);
  const { reload: reloadCtx } = useSalesStatuses();

  const load = async () => {
    setLoading(true);
    try {
      const res = await Statuses.list();
      setRows((res.data ?? []) as unknown as SalesStatus[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load statuses");
    } finally {
      setLoading(false);
      void reloadCtx();
    }
  };
  useEffect(() => { load(); }, []);

  const move = async (row: SalesStatus, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swap = rows[idx + dir];
    if (!swap) return;
    try {
      await Promise.all([
        Statuses.update(row.id, { sort_order: swap.sort_order }),
        Statuses.update(swap.id, { sort_order: row.sort_order }),
      ]);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reorder");
    }
  };

  const toggleActive = async (row: SalesStatus) => {
    try {
      await Statuses.update(row.id, { is_active: !row.is_active });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle status");
    }
  };

  const remove = async (row: SalesStatus) => {
    try {
      const probe = await Leads.list({ status: row.key as never, per_page: 1 });
      const count = probe.meta?.total ?? 0;
      if (count > 0) {
        toast.error(`এই status এ ${count} টি lead আছে — আগে move করুন`);
        return;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to check leads");
      return;
    }
    if (!confirm(`Delete "${row.label}"?`)) return;
    try {
      await Statuses.remove(row.id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Pipeline / Funnel</h2>
          <p className="text-xs text-muted-foreground">Lead যে stage-গুলোর মধ্যে দিয়ে যাবে সেগুলো customize করুন</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="h-4 w-4" /> Add Status
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const c = STATUS_COLORS[r.color] ?? STATUS_COLORS.blue;
            return (
              <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 ${r.is_active ? "border-border bg-card" : "border-dashed border-border bg-muted/30 opacity-60"}`}>
                <div className="flex flex-col">
                  <button onClick={() => move(r, -1)} disabled={i === 0} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
                  <button onClick={() => move(r, 1)} disabled={i === rows.length - 1} className="rounded p-0.5 text-muted-foreground hover:bg-muted disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
                </div>
                <span className="text-xs font-bold text-muted-foreground w-6">#{i + 1}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${c.bg} ${c.text}`}>{r.label}</span>
                <code className="text-[10px] text-muted-foreground">{r.key}</code>
                <div className="ml-auto flex items-center gap-2">
                  {r.is_won && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><Trophy className="h-3 w-3" /> Converted</span>}
                  {r.is_default && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Default</span>}
                  <button onClick={() => setEdit(r)} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"><Pencil className="inline h-3 w-3" /></button>
                  <button onClick={() => toggleActive(r)} className={`rounded-md border px-2 py-1 text-xs ${r.is_active ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}>{r.is_active ? "Hide" : "Show"}</button>
                  <button onClick={() => remove(r)} className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"><Trash2 className="inline h-3 w-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(edit || adding) && (
        <StatusModal
          row={edit}
          existingKeys={rows.map((r) => r.key)}
          nextOrder={(rows[rows.length - 1]?.sort_order ?? 0) + 1}
          onClose={() => { setEdit(null); setAdding(false); }}
          onSaved={() => { setEdit(null); setAdding(false); load(); }}
        />
      )}
    </div>
  );
}

function StatusModal({ row, existingKeys, nextOrder, onClose, onSaved }: {
  row: SalesStatus | null; existingKeys: string[]; nextOrder: number; onClose: () => void; onSaved: () => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [key, setKey] = useState(row?.key ?? "");
  const [color, setColor] = useState(row?.color ?? "blue");
  const [isWon, setIsWon] = useState(row?.is_won ?? false);
  const [isDefault, setIsDefault] = useState(row?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const isNew = !row;

  const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  const submit = async () => {
    setSaving(true);
    const k = isNew ? slug(key || label) : row!.key;
    if (isNew && existingKeys.includes(k)) {
      toast.error("এই key already আছে"); setSaving(false); return;
    }
    if (!label || !k) { toast.error("Label required"); setSaving(false); return; }
    const payload: Partial<SalesStatusRow> = { label, color, is_won: isWon, is_default: isDefault };
    try {
      if (isNew) {
        await Statuses.create({ ...payload, key: k, sort_order: nextOrder });
      } else {
        await Statuses.update(row!.id, payload);
      }
      toast.success("Saved");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
        <h3 className="text-lg font-extrabold">{isNew ? "Add Status" : "Edit Status"}</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold">
            <span className="text-muted-foreground">Label</span>
            <input value={label} onChange={(e) => { setLabel(e.target.value); if (isNew) setKey(slug(e.target.value)); }} className="input mt-1" placeholder="e.g. Demo Booked" />
          </label>
          {isNew && (
            <label className="block text-xs font-semibold">
              <span className="text-muted-foreground">Key (unique)</span>
              <input value={key} onChange={(e) => setKey(slug(e.target.value))} className="input mt-1" placeholder="demo_booked" />
            </label>
          )}
          <div>
            <span className="text-xs font-semibold text-muted-foreground">Color</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {Object.keys(STATUS_COLORS).map((c) => {
                const cm = STATUS_COLORS[c];
                return (
                  <button key={c} onClick={() => setColor(c)} className={`rounded-full px-3 py-1 text-xs font-bold ${cm.bg} ${cm.text} ${color === c ? "ring-2 ring-offset-1 ring-blue-600" : ""}`}>{c}</button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isWon} onChange={(e) => setIsWon(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
            <Trophy className="h-4 w-4 text-emerald-600" /> Converted marker (deal completed)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-blue-600" />
            Default starting status (নতুন lead এই status এ যাবে)
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button onClick={submit} disabled={saving || !label} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ============ TARGETS TAB ============ */
interface TargetRow { id: string; sales_user_id: string; month: string; target_amount: number; period_type: "month" | "quarter"; }
interface RepLite { id: string; full_name: string; role: string; }

function quarterStart(year: number, q: number) {
  return new Date(year, (q - 1) * 3, 1);
}
function currentQuarter(d = new Date()) {
  return Math.floor(d.getMonth() / 3) + 1;
}

function TargetsTab() {
  const today = new Date();
  const [periodType, setPeriodType] = useState<"month" | "quarter">("month");
  const [month, setMonth] = useState<string>(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);
  const [year, setYear] = useState<number>(today.getFullYear());
  const [quarter, setQuarter] = useState<number>(currentQuarter(today));
  const [reps, setReps] = useState<RepLite[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [achieved, setAchieved] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { periodDate, start, end, label } = useMemo(() => {
    if (periodType === "quarter") {
      const s = quarterStart(year, quarter);
      const e = new Date(s); e.setMonth(e.getMonth() + 3);
      const pd = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-01`;
      return { periodDate: pd, start: s, end: e, label: `Q${quarter} ${year}` };
    }
    const s = new Date(`${month}-01T00:00:00`);
    const e = new Date(s); e.setMonth(e.getMonth() + 1);
    return { periodDate: `${month}-01`, start: s, end: e, label: s.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }, [periodType, month, year, quarter]);

  const load = async () => {
    setLoading(true);
    try {
      const [r, t, w] = await Promise.all([
        SalesUsers.list(),
        Targets.list({ month: periodDate, period_type: periodType }),
        Leads.list({ won_from: start.toISOString(), won_to: end.toISOString(), per_page: 5000 }),
      ]);
      setReps(((r.data ?? []) as unknown as RepLite[]).map((u) => ({ id: u.id, full_name: u.full_name, role: u.role })));
      setTargets((t.data ?? []) as unknown as TargetRow[]);
      const map: Record<string, number> = {};
      for (const row of (w.data ?? []) as unknown as { assigned_to: string | null; deal_value: number | null }[]) {
        if (!row.assigned_to) continue;
        map[row.assigned_to] = (map[row.assigned_to] ?? 0) + Number(row.deal_value ?? 0);
      }
      setAchieved(map);
      setEdits({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load targets");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodDate, periodType]);

  const targetFor = (uid: string) => targets.find((t) => t.sales_user_id === uid)?.target_amount ?? 0;
  const save = async (uid: string) => {
    const v = Number(edits[uid] ?? targetFor(uid)) || 0;
    try {
      await Targets.upsert({ sales_user_id: uid, month: periodDate, period_type: periodType, target_amount: v });
      toast.success("Target saved");
      setEdits((p) => { const n = { ...p }; delete n[uid]; return n; });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save target");
    }
  };

  const totalTarget = reps.reduce((s, r) => s + targetFor(r.id), 0);
  const totalAchieved = reps.reduce((s, r) => s + (achieved[r.id] ?? 0), 0);
  const totalPct = totalTarget > 0 ? Math.min(100, Math.round((totalAchieved / totalTarget) * 100)) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Sales Targets — {label}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs font-semibold">
            <button onClick={() => setPeriodType("month")} className={`rounded-md px-3 py-1.5 ${periodType === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Monthly</button>
            <button onClick={() => setPeriodType("quarter")} className={`rounded-md px-3 py-1.5 ${periodType === "quarter" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Quarterly</button>
          </div>
          {periodType === "month" ? (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-44" />
          ) : (
            <div className="flex items-center gap-2">
              <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))} className="input w-24">
                {[1, 2, 3, 4].map((q) => <option key={q} value={q}>Q{q}</option>)}
              </select>
              <input type="number" value={year} min={2020} max={2100} onChange={(e) => setYear(Number(e.target.value) || today.getFullYear())} className="input w-24" />
            </div>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">প্রতি sales rep-এর {periodType === "month" ? "monthly" : "quarterly"} target সেট করুন। Converted lead-এর deal value থেকে achievement auto-calculate হয়।</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Target</div>
          <div className="mt-1 text-xl font-extrabold">৳{totalTarget.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Total Achieved</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-600">৳{totalAchieved.toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-[11px] font-bold uppercase text-muted-foreground">Overall Progress</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${totalPct}%` }} />
            </div>
            <span className="text-sm font-bold">{totalPct}%</span>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Sales Rep</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Target ৳</th>
                <th className="px-4 py-3">Achieved ৳</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reps.map((r) => {
                const tgt = targetFor(r.id);
                const ach = achieved[r.id] ?? 0;
                const pct = tgt > 0 ? Math.min(100, Math.round((ach / tgt) * 100)) : 0;
                const editing = edits[r.id] !== undefined;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold">{r.full_name}</td>
                    <td className="px-4 py-3 text-xs uppercase text-muted-foreground">{r.role}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        value={editing ? edits[r.id] : String(tgt)}
                        onChange={(e) => setEdits((p) => ({ ...p, [r.id]: e.target.value }))}
                        className="input w-32 py-1"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">৳{ach.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editing && (
                        <button onClick={() => save(r.id)} className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                          <Check className="inline h-3 w-3" /> Save
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {reps.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No sales reps yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============ WhatsApp Templates Tab ============ */
type Template = {
  id: string;
  name: string;
  category: string;
  body: string;
  is_active: boolean;
  sort_order: number;
};

const TEMPLATE_VARS = ["name", "phone", "course", "batch", "rep_name", "follow_up"];

function TemplatesTab() {
  const [rows, setRows] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await MessageTemplates.list();
      setRows((res.data ?? []) as unknown as Template[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await MessageTemplates.remove(id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete template");
    }
  };

  const toggleActive = async (t: Template) => {
    try {
      await MessageTemplates.update(t.id, { is_active: !t.is_active });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to toggle template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold">WhatsApp Message Templates</h2>
          <p className="text-xs text-muted-foreground">
            Variables: {TEMPLATE_VARS.map((v) => `{{${v}}}`).join(" • ")}
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No templates yet. Create your first one.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((t) => (
            <div
              key={t.id}
              className={`rounded-xl border bg-card p-4 shadow-sm transition ${
                t.is_active ? "border-border" : "border-dashed border-border opacity-60"
              }`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-extrabold">{t.name}</h3>
                  <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {t.category}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(t)}
                    title={t.is_active ? "Deactivate" : "Activate"}
                    className={`rounded-md p-1.5 ${
                      t.is_active ? "text-emerald-600 hover:bg-emerald-50" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/50 p-2 font-sans text-xs text-foreground">
                {t.body}
              </pre>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TemplateModal
          row={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function TemplateModal({
  row,
  onClose,
  onSaved,
}: {
  row: Template | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [category, setCategory] = useState(row?.category ?? "general");
  const [body, setBody] = useState(row?.body ?? "");
  const [sortOrder, setSortOrder] = useState(row?.sort_order ?? 99);
  const [saving, setSaving] = useState(false);

  const insertVar = (k: string) => setBody((b) => `${b}{{${k}}}`);

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and body required");
      return;
    }
    setSaving(true);
    const payload: Partial<SalesMessageTemplate> = {
      name: name.trim(),
      category: category.trim() || "general",
      body: body,
      sort_order: sortOrder,
    };
    try {
      if (row) await MessageTemplates.update(row.id, payload);
      else await MessageTemplates.create(payload);
      toast.success(row ? "Updated" : "Created");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold">{row ? "Edit Template" : "New Template"}</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_80px]">
            <div>
              <label className="text-xs font-semibold">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                placeholder="Welcome Message"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Category</label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                placeholder="welcome / followup / payment"
              />
            </div>
            <div>
              <label className="text-xs font-semibold">Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-semibold">Message Body</label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold hover:bg-primary hover:text-primary-foreground"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-border bg-background p-3 text-sm font-mono"
              placeholder={"হ্যালো {{name}}, ..."}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-1.5 text-sm">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {row ? "Save Changes" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Audit Log Tab ============ */

type AuditEntry = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  row_id: string | null;
  changed_fields: string[] | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  lead_id: string | null;
  created_at: string;
};

const AUDIT_TABLES = [
  "leads",
  "lead_notes",
  "lead_activities",
  "follow_ups",
  "sales_payments",
  "sales_targets",
  "sales_users",
  "sales_statuses",
  "sales_priorities",
  "sales_lead_sources",
  "sales_courses",
  "sales_payment_methods",
  "sales_expense_categories",
  "sales_message_templates",
  "sales_system_settings",
  "expenses",
];

function actionBadge(a: string) {
  const map: Record<string, string> = {
    INSERT: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    UPDATE: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    DELETE: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  };
  return map[a] ?? "bg-muted text-foreground";
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 60) + "…" : v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function AuditLogTab() {
  const [rows, setRows] = useState<AuditEntry[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [tableFilter, setTableFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(200);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const filters: { action?: string; table_name?: string; per_page?: number } = { per_page: limit };
      if (tableFilter) filters.table_name = tableFilter;
      if (actionFilter) filters.action = actionFilter;
      const res = await AuditLogs.list(filters);
      setRows((res.data ?? []) as unknown as AuditEntry[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load audit log");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter, actionFilter, limit]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const sQ = search.trim().toLowerCase();
    const actorQ = actorFilter.trim().toLowerCase();
    if (!sQ && !actorQ) return rows;
    return rows.filter((r) => {
      if (actorQ && !(r.actor_email ?? "").toLowerCase().includes(actorQ)) return false;
      if (!sQ) return true;
      return (
        (r.actor_email ?? "").toLowerCase().includes(sQ) ||
        (r.row_id ?? "").toLowerCase().includes(sQ) ||
        (r.changed_fields ?? []).some((f) => f.toLowerCase().includes(sQ)) ||
        JSON.stringify(r.new_data ?? r.old_data ?? {}).toLowerCase().includes(sQ)
      );
    });
  }, [rows, search, actorFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Audit Log</h2>
          <p className="text-xs text-muted-foreground">
            Complete history — who did what, when, and what changed
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-5">
        <div className="col-span-2 flex items-center gap-2 rounded-md border border-border bg-background px-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, id, field, value…"
            className="h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">All tables</option>
          {AUDIT_TABLES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="">All actions</option>
          <option value="INSERT">INSERT</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <input
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Actor email…"
          className="h-9 rounded-md border border-border bg-background px-2 text-sm"
        />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-3 py-2 text-xs">
          <span className="font-semibold">{filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="h-7 rounded border border-border bg-background px-1 text-xs"
            >
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
            <button
              onClick={load}
              className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          {rows === null ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No entries</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left">When</th>
                  <th className="px-3 py-2 text-left">Actor</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">Table</th>
                  <th className="px-3 py-2 text-left">Changed</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isOpen = expanded === r.id;
                  return (
                    <>
                      <tr
                        key={r.id}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("en-GB")}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.actor_email ?? (
                            <span className="text-muted-foreground italic">system</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${actionBadge(r.action)}`}
                          >
                            {r.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{r.table_name}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.action === "UPDATE" && r.changed_fields?.length
                            ? r.changed_fields.slice(0, 4).join(", ") +
                              (r.changed_fields.length > 4
                                ? ` +${r.changed_fields.length - 4}`
                                : "")
                            : r.row_id?.slice(0, 8) ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setExpanded(isOpen ? null : r.id)}
                            className="rounded border border-border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {isOpen ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.id}-d`} className="border-t border-border bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid gap-3 lg:grid-cols-2">
                              <div>
                                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Meta
                                </p>
                                <div className="space-y-0.5 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">Row ID: </span>
                                    <span className="font-mono">{r.row_id}</span>
                                  </div>
                                  {r.lead_id && (
                                    <div>
                                      <span className="text-muted-foreground">Lead: </span>
                                      <span className="font-mono">{r.lead_id}</span>
                                    </div>
                                  )}
                                  <div>
                                    <span className="text-muted-foreground">Actor ID: </span>
                                    <span className="font-mono">{r.actor_id ?? "—"}</span>
                                  </div>
                                </div>
                              </div>

                              {r.action === "UPDATE" && r.changed_fields?.length ? (
                                <div>
                                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Changes
                                  </p>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-muted-foreground">
                                        <th className="pr-2">Field</th>
                                        <th className="pr-2">Before</th>
                                        <th>After</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.changed_fields.map((f) => (
                                        <tr key={f} className="border-t border-border/50">
                                          <td className="py-1 pr-2 font-mono">{f}</td>
                                          <td className="py-1 pr-2 text-rose-600 dark:text-rose-400">
                                            {fmtVal((r.old_data ?? {})[f])}
                                          </td>
                                          <td className="py-1 text-emerald-600 dark:text-emerald-400">
                                            {fmtVal((r.new_data ?? {})[f])}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div>
                                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {r.action === "DELETE" ? "Deleted Data" : "Data"}
                                  </p>
                                  <pre className="max-h-64 overflow-auto rounded bg-background p-2 text-[11px]">
                                    {JSON.stringify(r.new_data ?? r.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ ROLE PERMISSIONS ============ */
function RolePermissionsTab({ onSaved }: { onSaved?: () => void }) {
  const { refresh } = useSalesAuth();
  const [rows, setRows] = useState<{ id: string; role: "admin" | "executive"; permissions: string[]; updated_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});

  const allKeys = useMemo(() => PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key)), []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await RolePermissions.list();
      const list = (res.data ?? []) as unknown as { role: "admin" | "manager" | "executive"; permissions: string[]; updated_at: string }[];
      setRows(list);
      const d: Record<string, Set<string>> = {};
      for (const r of list) d[r.role] = new Set(r.permissions ?? []);
      setDraft(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load role permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (role: string, key: PermissionKey) => {
    setDraft((prev) => {
      const next = { ...prev };
      const s = new Set(next[role] ?? []);
      if (s.has(key)) s.delete(key); else s.add(key);
      next[role] = s;
      return next;
    });
  };

  const setAll = (role: string, on: boolean) => {
    setDraft((prev) => ({ ...prev, [role]: new Set(on ? allKeys : []) }));
  };

  const save = async (role: "admin" | "manager" | "executive") => {
    const target = rows.find((r) => r.role === role);
    if (!target) { toast.error("Role row not found"); return; }
    setSavingRole(role);
    const perms = Array.from(draft[role] ?? new Set<string>());
    try {
      await RolePermissions.update(target.role, perms);
      toast.success(`${role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Sales Executive"} role permissions saved`);
      await load();
      await refresh();
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingRole(null);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">Role Permissions</h2>
            <p className="text-xs text-muted-foreground">প্রতি role-এর জন্য default permission set ঠিক করুন। কোনো individual user-কে আলাদাভাবে আরও permission দিতে চাইলে Team Members tab → Permissions থেকে override করতে পারবেন। Admin সবসময় সব access পায়।</p>
          </div>
        </div>
      </div>

      {rows.map((r) => {
        const perms = draft[r.role] ?? new Set<string>();
        const allOn = allKeys.every((k) => perms.has(k));
        const isAdminRole = r.role === "admin";
        return (
          <div key={r.role} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold capitalize">
                  {r.role === "admin" ? "Sales Admin" : r.role === "manager" ? "Sales Manager" : "Sales Executive"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {perms.size} of {allKeys.length} permissions enabled
                  {isAdminRole && " · Admin role automatically has every permission in the app — these toggles are informational only."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAll(r.role, !allOn)}
                  disabled={isAdminRole}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-bold hover:bg-muted disabled:opacity-50"
                >
                  {allOn ? "Clear all" : "Select all"}
                </button>
                <button
                  onClick={() => save(r.role)}
                  disabled={savingRole === r.role || isAdminRole}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-95 disabled:opacity-50"
                >
                  {savingRole === r.role && <Loader2 className="h-3 w-3 animate-spin" />} Save
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {PERMISSION_GROUPS.map((g) => (
                <div key={g.title}>
                  <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.title}</h4>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {g.items.map((p) => {
                      const on = perms.has(p.key);
                      return (
                        <label
                          key={p.key}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                            on ? "border-blue-300 bg-blue-50/60" : "border-border bg-card hover:bg-muted/40"
                          } ${isAdminRole ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={isAdminRole}
                            onChange={() => toggle(r.role, p.key)}
                            className="mt-0.5 h-4 w-4 accent-blue-600"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-bold text-slate-900">{p.label}</div>
                            <div className="text-xs text-muted-foreground">{p.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
