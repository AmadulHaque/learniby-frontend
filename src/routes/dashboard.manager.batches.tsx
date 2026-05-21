import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Loader2, Users } from "lucide-react";

export const Route = createFileRoute("/dashboard/manager/batches")({
  component: BatchesPage,
});

type Batch = { id: string; name: string; description?: string | null; created_at: string };
const PRIMARY = "#7B1CB8";

function BatchesPage() {
  const [list, setList] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("batches").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!form.name.trim()) return toast.error("নাম দিন");
    setSaving(true);
    const { error } = await supabase.from("batches").insert({
      name: form.name.trim(),
      description: form.description.trim() || null,
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("যোগ হয়েছে");
    setOpen(false);
    setForm({ name: "", description: "" });
    reload();
  };

  const del = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    const { error } = await supabase.from("batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("ডিলিট হয়েছে");
    reload();
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
