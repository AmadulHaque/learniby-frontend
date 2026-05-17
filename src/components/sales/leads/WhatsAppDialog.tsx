import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Sparkles, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sales } from "@/lib/api";
import { useSalesAuth } from "@/contexts/SalesAuthContext";
import type { Lead, LeadActivity } from "@/lib/leads";
import { cn } from "@/lib/utils";

export interface MessageTemplate {
  id: string;
  name: string;
  category: string;
  body: string;
  is_active: boolean;
  sort_order: number;
}

const VARIABLES = [
  { key: "name", label: "Lead Name" },
  { key: "phone", label: "Phone" },
  { key: "course", label: "Course" },
  { key: "batch", label: "Batch" },
  { key: "rep_name", label: "Sales Rep" },
  { key: "follow_up", label: "Follow-up Date" },
];

export function renderTemplate(
  body: string,
  ctx: Record<string, string>,
): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => ctx[k] ?? `{{${k}}}`);
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lead: Lead;
  onSent?: (a: LeadActivity) => void;
}

export function WhatsAppDialog({ open, onOpenChange, lead, onSent }: Props) {
  const { salesUser } = useSalesAuth();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const ctx = useMemo<Record<string, string>>(
    () => ({
      name: lead.full_name ?? "",
      phone: lead.phone ?? "",
      course: (lead.courses?.[0] as string) ?? "",
      batch: (lead.batch_preference as string) ?? "",
      rep_name: salesUser?.full_name ?? "",
      follow_up: lead.follow_up_date
        ? new Date(lead.follow_up_date).toLocaleString()
        : "",
    }),
    [lead, salesUser],
  );

  const preview = useMemo(() => renderTemplate(body, ctx), [body, ctx]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    sales.taxonomy.messageTemplates
      .list()
      .then((rows) => {
        const active = rows
          .filter((r) => r.is_active)
          .sort((a, b) => a.sort_order - b.sort_order);
        setTemplates(
          active.map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            body: r.body,
            is_active: r.is_active,
            sort_order: r.sort_order,
          })),
        );
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Failed to load templates");
      })
      .finally(() => setLoading(false));
  }, [open]);

  // reset on close
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setBody("");
    }
  }, [open]);

  const phoneDigits = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
  const canSend = preview.trim().length > 0 && phoneDigits.length > 5;

  const sendNow = async () => {
    if (!canSend) {
      toast.error("Phone or message missing");
      return;
    }
    setSending(true);
    const tpl = templates.find((t) => t.id === selectedId);
    const title = tpl ? `WhatsApp: ${tpl.name}` : "WhatsApp Sent";

    try {
      const act = await sales.leadActivities.create(lead.id, {
        type: "whatsapp_sent",
        title,
        description: preview,
        meta: { template_id: tpl?.id ?? null, channel: "wa.me" },
      });

      // Open WhatsApp
      const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(preview)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      onSent?.(act as unknown as LeadActivity);
      toast.success("WhatsApp opened — message logged");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log activity");
    } finally {
      setSending(false);
    }
  };

  const insertVar = (k: string) => {
    setBody((b) => `${b}{{${k}}}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sales-theme max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
              <MessageCircle className="h-4 w-4" />
            </span>
            Send WhatsApp to {lead.full_name}
          </DialogTitle>
          <DialogDescription>
            Pick a template or type custom — WhatsApp will open with the message ready to send.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          {/* Template list */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">
              Templates
            </Label>
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
              <button
                onClick={() => {
                  setSelectedId(null);
                  setBody("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition",
                  selectedId === null
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="font-semibold">Custom message</span>
              </button>
              {loading && (
                <div className="flex justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id);
                    setBody(t.body);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-sm transition",
                    selectedId === t.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{t.name}</div>
                    <div className="truncate text-[11px] opacity-70">
                      {t.category}
                    </div>
                  </div>
                </button>
              ))}
              {!loading && templates.length === 0 && (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No templates yet. Admin can add from Settings.
                </p>
              )}
            </div>
          </div>

          {/* Editor + preview */}
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs font-bold uppercase text-muted-foreground">
                  Message
                </Label>
                <div className="flex flex-wrap gap-1">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVar(v.key)}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold hover:bg-primary hover:text-primary-foreground"
                      title={v.label}
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Type your message or pick a template..."
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                Preview
              </Label>
              <motion.div
                key={preview}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-900"
              >
                {preview || (
                  <span className="text-muted-foreground">
                    Preview will appear here...
                  </span>
                )}
              </motion.div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                To: +{phoneDigits || "—"} • Channel: WhatsApp
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendNow}
                disabled={!canSend || sending}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {sending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1 h-4 w-4" />
                )}
                Open WhatsApp & Log
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
