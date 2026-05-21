import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCog, Tag, Flag, Loader2, CalendarClock } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Leads, Activities, type LeadWritePayload } from "@/lib/sales-api";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import type { LeadPriority } from "@/lib/leads";

export type BulkMode = "reassign" | "status" | "priority" | null;

const PRIORITIES: { key: LeadPriority; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "medium", label: "Medium" },
  { key: "high", label: "High" },
  { key: "urgent", label: "Urgent" },
];

export function BulkActionsDialog({
  mode,
  onClose,
  selectedIds,
  reps,
  onApplied,
}: {
  mode: BulkMode;
  onClose: () => void;
  selectedIds: string[];
  reps: { id: string; full_name: string }[];
  onApplied: (patch: Partial<{ assigned_to: string | null; status: string; priority: LeadPriority }>) => void;
}) {
  const { statuses } = useSalesStatuses();
  const [value, setValue] = useState<string>("");
  const [reason, setReason] = useState("");
  const [followUpAt, setFollowUpAt] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue("");
    setReason("");
    setFollowUpAt("");
  }, [mode]);

  const requireFollowUp = mode === "status" && value === "follow_up";

  const open = mode !== null;
  const count = selectedIds.length;

  const titleMap: Record<Exclude<BulkMode, null>, string> = {
    reassign: "Reassign Leads",
    status: "Change Status",
    priority: "Change Priority",
  };

  const handleApply = async () => {
    if (!mode || !value || count === 0) {
      toast.error("Please select a value");
      return;
    }
    setBusy(true);
    try {
      let patch: Record<string, unknown> = {};
      let activityType = "";
      let activityDetails: Record<string, unknown> = {};

      if (mode === "reassign") {
        const newAssignee = value === "__unassign__" ? null : value;
        patch = { assigned_to: newAssignee };
        activityType = "reassigned";
        const repName = reps.find((r) => r.id === newAssignee)?.full_name ?? "Unassigned (back to pool)";
        activityDetails = { to: newAssignee, to_name: repName, reason: reason || null, bulk: true };
      } else if (mode === "status") {
        if (value === "follow_up") {
          if (!followUpAt) {
            toast.error("Follow-up date & time is required");
            setBusy(false);
            return;
          }
          const d = new Date(followUpAt);
          if (isNaN(d.getTime()) || d.getTime() < Date.now() - 60_000) {
            toast.error("Follow-up date must be in the future");
            setBusy(false);
            return;
          }
          patch = { status: value, follow_up_date: d.toISOString() };
        } else {
          patch = { status: value };
        }
        activityType = "status_changed";
        activityDetails = { to: value, reason: reason || null, bulk: true };
      } else if (mode === "priority") {
        patch = { priority: value };
        activityType = "priority_changed";
        activityDetails = { to: value, reason: reason || null, bulk: true };
      }

      const updatePayload = patch as LeadWritePayload;
      await Promise.all(selectedIds.map((id) => Leads.update(id, updatePayload)));

      // Best-effort activity log (ignore errors so UX isn't blocked)
      try {
        await Promise.all(
          selectedIds.map((leadId) =>
            Activities.create(leadId, { type: activityType, meta: activityDetails }),
          ),
        );
      } catch {
        /* noop */
      }

      toast.success(`${count} lead${count > 1 ? "s" : ""} updated`);
      onApplied(patch as never);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sales-theme sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "reassign" && <UserCog className="h-5 w-5 text-blue-600" />}
            {mode === "status" && <Tag className="h-5 w-5 text-blue-600" />}
            {mode === "priority" && <Flag className="h-5 w-5 text-blue-600" />}
            {mode ? titleMap[mode] : ""}
          </DialogTitle>
          <DialogDescription>
            Apply this change to <span className="font-bold text-blue-700">{count}</span> selected lead{count > 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {mode === "reassign" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">Assign to</label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger><SelectValue placeholder="Choose a sales rep" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassign__">— Unassign (release to pool)</SelectItem>
                  {reps.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {mode === "status" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">New status</label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger><SelectValue placeholder="Choose a status" /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {requireFollowUp && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3">
              <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-blue-800">
                <CalendarClock className="h-3.5 w-3.5" />
                Follow-up date & time <span className="text-rose-500">*</span>
              </label>
              <Input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                min={(() => {
                  const n = new Date();
                  const pad = (x: number) => String(x).padStart(2, "0");
                  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}T${pad(n.getHours())}:${pad(n.getMinutes())}`;
                })()}
                className="font-semibold text-blue-900"
              />
              <p className="mt-1 text-[11px] text-blue-700/80">
                সব selected lead এই তারিখে follow-up reminder পাবে।
              </p>
            </div>
          )}

          {mode === "priority" && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">New priority</label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger><SelectValue placeholder="Choose a priority" /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Reason / note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rep on leave, redistributing leads…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            onClick={handleApply}
            disabled={busy || !value || (requireFollowUp && !followUpAt)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply to {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
