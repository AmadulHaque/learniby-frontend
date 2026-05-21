import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Radio, Plus, Loader2, Trash2, ExternalLink, Calendar, Clock } from "lucide-react";
import { ApiError } from "@/lib/api";
import {
  Batches,
  ClassSessions,
  type BatchRow,
  type ClassSessionRow,
} from "@/lib/teacher-api";

const PRIMARY = "#7B1CB8";

/**
 * Reusable sessions manager.
 * - mode: "manage" (admin/manager) -> can see all batches and all sessions
 * - mode: "teacher" -> only batches assigned via batch_teachers
 */
export function SessionsManager({
  mode,
  title = "লাইভ ক্লাস লিংক",
}: {
  mode: "manage" | "teacher";
  title?: string;
}) {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [sessions, setSessions] = useState<ClassSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassSessionRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    batch_id: "",
    title: "",
    description: "",
    meeting_link: "",
    scheduled_at: "",
    duration_min: 60,
  });

  const reload = async () => {
    setLoading(true);
    try {
      const batchScope = mode === "teacher" ? "mine" : undefined;
      const sessionScope = mode === "teacher" ? "mine" : undefined;
      const [bs, ss] = await Promise.all([
        Batches.list({ scope: batchScope }),
        ClassSessions.list({ scope: sessionScope, direction: "desc" }),
      ]);
      setBatches(bs.data ?? []);
      setSessions(ss.data ?? []);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "লোড করতে সমস্যা";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const filtered = useMemo(
    () => (filterBatch === "all" ? sessions : sessions.filter((s) => s.batch_id === filterBatch)),
    [sessions, filterBatch]
  );

  const batchName = (id: string) => batches.find((b) => b.id === id)?.name || "—";

  const openCreate = () => {
    setEditing(null);
    setForm({
      batch_id: batches[0]?.id || "",
      title: "",
      description: "",
      meeting_link: "",
      scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16),
      duration_min: 60,
    });
    setOpen(true);
  };

  const openEdit = (s: ClassSessionRow) => {
    setEditing(s);
    setForm({
      batch_id: s.batch_id,
      title: s.title,
      description: s.description || "",
      meeting_link: s.meeting_link,
      scheduled_at: new Date(s.scheduled_at).toISOString().slice(0, 16),
      duration_min: s.duration_min,
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.batch_id || !form.title.trim() || !form.meeting_link.trim() || !form.scheduled_at) {
      toast.error("সব ফিল্ড পূরণ করুন");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        batch_id: form.batch_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        meeting_link: form.meeting_link.trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_min: Number(form.duration_min) || 60,
      };
      if (editing) {
        await ClassSessions.update(editing.id, payload);
        toast.success("আপডেট হয়েছে");
      } else {
        await ClassSessions.create(payload);
        toast.success("লিংক যোগ হয়েছে");
      }
      setOpen(false);
      await reload();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "সেভ করতে সমস্যা";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("এই সেশন ডিলিট করবেন?")) return;
    try {
      await ClassSessions.remove(id);
      toast.success("ডিলিট হয়েছে");
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "ডিলিট করতে সমস্যা");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">ক্লাস শুরুর আগে লিংক যোগ করুন — স্টুডেন্টরা তাদের ব্যাচে দেখতে পাবে।</p>
        </div>
        <div className="flex items-center gap-2">
          {batches.length > 1 && (
            <Select value={filterBatch} onValueChange={setFilterBatch}>
              <SelectTrigger className="w-45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ব্যাচ</SelectItem>
                {batches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openCreate} disabled={batches.length === 0} style={{ background: PRIMARY }}>
            <Plus className="mr-1 h-4 w-4" /> নতুন লিংক
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} />
        </div>
      ) : batches.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          আপনার কোনো ব্যাচ assign করা নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Radio className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">এখনো কোনো লাইভ ক্লাস লিংক নেই</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const upcoming = new Date(s.scheduled_at).getTime() > Date.now() - 30 * 60 * 1000;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ background: "#F7F1FB", color: PRIMARY }}
                      >
                        {batchName(s.batch_id)}
                      </span>
                      {upcoming && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          আসন্ন
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-1 text-sm text-slate-600">{s.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(s.scheduled_at).toLocaleString("bn-BD", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration_min} মিনিট
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={s.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white"
                      style={{ background: PRIMARY }}
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Join
                    </a>
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      এডিট
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => del(s.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "লিংক এডিট" : "নতুন লাইভ ক্লাস লিংক"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>ব্যাচ</Label>
              <Select
                value={form.batch_id}
                onValueChange={(v) => setForm((f) => ({ ...f, batch_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ব্যাচ নির্বাচন" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>শিরোনাম</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="যেমন: HSC Physics — Chapter 5"
              />
            </div>
            <div>
              <Label>মিটিং লিংক</Label>
              <Input
                value={form.meeting_link}
                onChange={(e) => setForm((f) => ({ ...f, meeting_link: e.target.value }))}
                placeholder="https://meet.google.com/xxx-xxx-xxx"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>সময়</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                />
              </div>
              <div>
                <Label>সময়কাল (মিনিট)</Label>
                <Input
                  type="number"
                  min={5}
                  value={form.duration_min}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, duration_min: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>বিবরণ (ঐচ্ছিক)</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={submit} disabled={saving} style={{ background: PRIMARY }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "আপডেট" : "যোগ করুন"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
