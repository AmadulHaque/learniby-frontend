import { defineRoute } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminListStudents, adminCreateStudent, adminDeleteStudent, adminResetPassword,
} from "@/rpc/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, UserPlus, Loader2, KeyRound, Trash2, Mail, Phone } from "lucide-react";

export const Route = defineRoute("/dashboard/manager/students")({
  component: StudentsPage,
});

interface Student {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  institution: string | null;
  student_id: string | null;
  batch_number: string | null;
  status: string;
}

const PRIMARY = "#7B1CB8";

function StudentsPage() {
  const { session } = useAuth();
  const [list, setList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [pwUser, setPwUser] = useState<Student | null>(null);
  const [newPw, setNewPw] = useState("");
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", phone: "", institution: "",
    student_id: "", batch_number: "", address: "",
  });

  const reload = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { students } = await adminListStudents({
        data: { accessToken: session.access_token, status: "approved" },
      });
      setList(students as unknown as Student[]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [session?.access_token]);

  const filtered = list.filter((s) =>
    !q.trim() ||
    [s.full_name, s.email, s.phone, s.institution, s.student_id, s.batch_number]
      .some((x) => x?.toLowerCase().includes(q.toLowerCase()))
  );

  const create = async () => {
    setAdding(true);
    try {
      await adminCreateStudent({
        data: { accessToken: session!.access_token, ...form, autoApprove: true },
      });
      toast.success("ছাত্র যোগ হয়েছে");
      setAddOpen(false);
      setForm({ full_name: "", email: "", password: "", phone: "", institution: "", student_id: "", batch_number: "", address: "" });
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("ডিলিট করবেন?")) return;
    try {
      await adminDeleteStudent({ data: { accessToken: session!.access_token, userId: id } });
      toast.success("মুছে ফেলা হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
  };

  const resetPw = async () => {
    if (!pwUser || newPw.length < 6) return toast.error("কমপক্ষে ৬ অক্ষর");
    try {
      await adminResetPassword({ data: { accessToken: session!.access_token, userId: pwUser.id, newPassword: newPw } });
      toast.success("পাসওয়ার্ড পরিবর্তিত");
      setPwUser(null); setNewPw("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">ছাত্র/ছাত্রী</h1>
          <p className="text-sm text-slate-500">মোট {list.length} জন</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন" className="w-64 pl-9" />
          </div>
          <Button onClick={() => setAddOpen(true)} style={{ background: PRIMARY }}>
            <UserPlus className="mr-1 h-4 w-4" /> নতুন ছাত্র
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: PRIMARY }} /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">কোনো ছাত্র নেই</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full font-bold text-white" style={{ background: PRIMARY }}>
                    {(s.full_name || s.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{s.full_name || "—"}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                      {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                      {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                      {s.batch_number && <span>ব্যাচ: {s.batch_number}</span>}
                      {s.student_id && <span>ID: {s.student_id}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPwUser(s)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(s.id)} className="text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন ছাত্র যোগ করুন</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="পূর্ণ নাম *" v={form.full_name} on={(v) => setForm({ ...form, full_name: v })} />
            <Field label="ইমেইল *" v={form.email} on={(v) => setForm({ ...form, email: v })} type="email" />
            <Field label="পাসওয়ার্ড * (অন্তত ৬ অক্ষর)" v={form.password} on={(v) => setForm({ ...form, password: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="স্টুডেন্ট আইডি" v={form.student_id} on={(v) => setForm({ ...form, student_id: v })} />
              <Field label="ব্যাচ নাম্বার" v={form.batch_number} on={(v) => setForm({ ...form, batch_number: v })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ফোন" v={form.phone} on={(v) => setForm({ ...form, phone: v })} />
              <Field label="প্রতিষ্ঠান" v={form.institution} on={(v) => setForm({ ...form, institution: v })} />
            </div>
            <Field label="ঠিকানা" v={form.address} on={(v) => setForm({ ...form, address: v })} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>বাতিল</Button>
            <Button onClick={create} disabled={adding} style={{ background: PRIMARY }}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>নতুন পাসওয়ার্ড</DialogTitle></DialogHeader>
          <Label>{pwUser?.full_name || pwUser?.email}</Label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwUser(null)}>বাতিল</Button>
            <Button onClick={resetPw} style={{ background: PRIMARY }}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type={type} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
