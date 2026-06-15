import { defineRoute, Navigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { StudentShell } from "@/components/course/StudentShell";
import { Zap, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = defineRoute("/dashboard/billing")({
  component: BillingPage,
  head: () => ({ meta: [{ title: "বিলিং ও রিপোর্ট — Learniby" }] }),
});

function BillingPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

  return (
    <StudentShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Transactions &amp; Invoices</h1>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Overview */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">Overview</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Stat icon={Zap} color="bg-sky-100 text-sky-600" label="Total Courses" value="0" />
              <Stat icon={CheckCircle2} color="bg-emerald-100 text-emerald-600" label="Paid" value="0" />
              <Stat icon={Clock} color="bg-amber-100 text-amber-600" label="Due" value="0" />
              <Stat icon={AlertTriangle} color="bg-rose-100 text-rose-600" label="Overdue" value="0" />
            </div>
          </div>

          {/* Status donut placeholder */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900">Transaction Status</h2>
            <div className="mt-4 grid place-items-center">
              <div className="relative grid h-44 w-44 place-items-center rounded-full border-[14px] border-slate-100">
                <div className="text-center">
                  <p className="text-2xl font-extrabold">৳ 0</p>
                  <p className="text-xs text-slate-500">Invoiced</p>
                </div>
              </div>
              <div className="mt-4 flex gap-5 text-xs font-semibold text-slate-600">
                <Legend color="bg-emerald-500" label="Paid" />
                <Legend color="bg-amber-500" label="Due" />
                <Legend color="bg-rose-500" label="Overdue" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option>All Courses</option>
            </select>
            <Input placeholder="Search" className="h-10" />
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option>All Types</option>
            </select>
            <select className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm">
              <option>All Status</option>
            </select>
            <div className="flex items-center gap-2">
              <button className="flex-1 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Clear
              </button>
              <button className="flex-1 rounded-md bg-[#7B1CB8] px-3 py-2 text-sm font-semibold text-white hover:brightness-110">
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Course &amp; Duration</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invoice Total</th>
                <th className="px-4 py-3">Invoice</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Showing 1 to 0 of 0 results
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </StudentShell>
  );
}

function Stat({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: typeof Zap;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-lg font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}
