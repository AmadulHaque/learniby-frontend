import { defineRoute, Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Loader2, Users } from "lucide-react";
import { ApiError } from "@/lib/api";
import { Batches, type BatchRow } from "@/lib/teacher-api";

export const Route = defineRoute("/dashboard/manager/batches")({
  component: BatchesPage,
});

const PRIMARY = "#7B1CB8";

function BatchesPage() {
  const [list, setList] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await Batches.list();
      setList(res.data ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "লোড করতে সমস্যা");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void reload(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("নাম দিন");
    setSaving(true);
    try {
      await Batches.create({
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      toast.success("যোগ হয়েছে");
      setOpen(false);
      setForm({ name: "", description: "" });
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "সেভ করতে সমস্যা");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    try {
      await Batches.remove(id);
      toast.success("ডিলিট হয়েছে");
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "ডিলিট করতে সমস্যা");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">ব্যাচ</h1>
          <p className="text-sm text-slate-500">মোট {list.length}টি</p>
        </div>
        <Button onClick={() => setOpen(true)} style={{ background: PRIMARY }}>
          <Plus className="mr-1 h-4 w-4" /> নতুন ব্যাচ
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} /></div>
      ) : list.length === 0 ? (
        <Card className="p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">এখনো কোনো ব্যাচ নেই</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{b.name}</h3>
                  {b.description && <p className="mt-1 text-sm text-slate-500">{b.description}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => del(b.id)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Link to={"/dashboard/manager/sessions" as any} className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: PRIMARY }}>
                  <Users className="h-3 w-3" /> লাইভ লিংক ম্যানেজ
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন ব্যাচ</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>ব্যাচের নাম *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>বিবরণ</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>বাতিল</Button>
            <Button onClick={create} disabled={saving} style={{ background: PRIMARY }}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} সংরক্ষণ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
