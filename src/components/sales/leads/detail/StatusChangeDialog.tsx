import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStatusMeta, formatMoney, type LeadStatus } from "@/lib/leads";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import {
  Phone,
  MessageCircle,
  Mail,
  MessageSquare,
  Users as UsersIcon,
  Facebook,
  Instagram,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const CONTACT_PLATFORMS: {
  value: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "phone", label: "Phone Call", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquare },
  { value: "in_person", label: "In-Person Meeting", icon: UsersIcon },
  { value: "facebook", label: "Facebook", icon: Facebook },
  { value: "instagram", label: "Instagram", icon: Instagram },
  { value: "other", label: "Other", icon: Sparkles },
];

export function platformLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return CONTACT_PLATFORMS.find((p) => p.value === value)?.label ?? value;
}

interface Props {
  open: boolean;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  /** When true, shows the "Final Sale Amount" input (status moves into a Won state). */
  isWonTransition?: boolean;
  /** Auto-suggested amount based on selected courses' default_price. */
  suggestedAmount?: number;
  /** When true, requires the user to pick a follow-up date/time before confirming. */
  requireFollowUp?: boolean;
  onClose: () => void;
  onConfirm: (data: {
    note: string;
    platform: string;
    dealAmount?: number | null;
    followUpAt?: string | null;
  }) => Promise<void>;
}

export function StatusChangeDialog({
  open,
  fromStatus,
  toStatus,
  isWonTransition = false,
  suggestedAmount = 0,
  requireFollowUp = false,
  onClose,
  onConfirm,
}: Props) {
  const [note, setNote] = useState("");
  const [platform, setPlatform] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [followUpAt, setFollowUpAt] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNote("");
      setPlatform("");
      setAmount(isWonTransition && suggestedAmount > 0 ? String(suggestedAmount) : "");
      // Default follow-up: tomorrow 10:00 AM, formatted for datetime-local input
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setFollowUpAt(requireFollowUp ? local : "");
    }
  }, [open, isWonTransition, suggestedAmount, requireFollowUp]);

  const { statuses: salesStatuses } = useSalesStatuses();
  const fromLabel = fromStatus ? getStatusMeta(fromStatus, salesStatuses).label : "";
  const toLabel = toStatus ? getStatusMeta(toStatus, salesStatuses).label : "";

  const submit = async () => {
    if (!platform) {
      toast.error("Contact platform is required");
      return;
    }
    if (!note.trim()) {
      toast.error("Note is required");
      return;
    }
    let dealAmount: number | null | undefined = undefined;
    if (isWonTransition) {
      const n = Number(amount);
      if (!amount || isNaN(n) || n <= 0) {
        toast.error("Final sale amount is required and must be greater than 0");
        return;
      }
      dealAmount = n;
    }
    let followUpIso: string | null | undefined = undefined;
    if (requireFollowUp) {
      if (!followUpAt) {
        toast.error("Follow-up date & time is required to move into Follow-up");
        return;
      }
      const d = new Date(followUpAt);
      if (isNaN(d.getTime())) {
        toast.error("Invalid follow-up date");
        return;
      }
      if (d.getTime() < Date.now() - 60_000) {
        toast.error("Follow-up date must be in the future");
        return;
      }
      followUpIso = d.toISOString();
    }
    setSaving(true);
    try {
      await onConfirm({ note: note.trim(), platform, dealAmount, followUpAt: followUpIso });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWonTransition && <Trophy className="h-5 w-5 text-emerald-600" />}
            {isWonTransition
              ? "Confirm Conversion 🎉"
              : `Change Status: ${fromLabel} → ${toLabel}`}
          </DialogTitle>
          <DialogDescription>
            {isWonTransition
              ? `Marking this lead as ${toLabel}. Confirm the final sale amount — defaults to the course price, override for special pricing.`
              : "Both fields are required to keep an audit trail of every pipeline change."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {isWonTransition && (
            <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <Label className="flex items-center gap-1.5 text-emerald-800">
                <Trophy className="h-3.5 w-3.5" />
                Final Sale Amount <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700">₹</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="pl-7 font-bold text-emerald-900"
                />
              </div>
              {suggestedAmount > 0 && (
                <p className="text-xs text-emerald-700/80">
                  Course default: <span className="font-semibold">{formatMoney(suggestedAmount)}</span>
                  {Number(amount) !== suggestedAmount && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(suggestedAmount))}
                      className="ml-2 underline hover:no-underline"
                    >
                      use default
                    </button>
                  )}
                </p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>
              Contact Platform <span className="text-rose-500">*</span>
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Where did you contact the lead?" />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_PLATFORMS.map((p) => {
                  const Icon = p.icon;
                  return (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="inline-flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {p.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Note <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was discussed? Why is this status changing?"
            />
          </div>
          {requireFollowUp && (
            <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/60 p-3">
              <Label className="flex items-center gap-1.5 text-blue-800">
                Follow-up Date & Time <span className="text-rose-500">*</span>
              </Label>
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
              <p className="text-xs text-blue-700/80">
                কখন follow-up করবেন সেটা সিলেক্ট করুন — এই lead সেদিন reminder পাবে।
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving} className={isWonTransition ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
            {saving ? "Saving…" : isWonTransition ? "Confirm Convert" : "Confirm Change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
