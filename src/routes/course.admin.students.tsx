import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminListStudents, adminSetStudentStatus, adminDeleteStudent, adminResetPassword, adminCreateStudent } from "@/server/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, XCircle, Trash2, Settings2, Mail, Phone, Building2, MapPin, Loader2, KeyRound, UserPlus, IdCard, Users,
} from "lucide-react";

export const Route = createFileRoute("/course/admin/students")({
  component: StudentsPage,
});

interface Student {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  institution: string | null;
  student_id: string | null;
  batch_number: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
}

function StudentsPage() {
  const { session } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pwUser, setPwUser] = useState<Student | null>(null);
  const [newPw, setNewPw] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", institution: "", address: "", student_id: "", batch_number: "", password: "" });

  const reload = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { students } = await adminListStudents({
        data: { accessToken: session.access_token, status: "approved" },
      });
      setStudents(students as unknown as Student[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, [session?.access_token]);

  const filtered = students.filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return [s.full_name, s.email, s.phone, s.institution, s.student_id, s.batch_number].some((x) => x?.toLowerCase().includes(t));
  });

  const revoke = async (id: string) => {
    if (!confirm("এই ছাত্রের অনুমোদন বাতিল করবেন?")) return;
    setBusy(id);
    try {
      await adminSetStudentStatus({ data: { accessToken: session!.access_token, userId: id, status: "rejected" } });
      toast.success("বাতিল হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("পুরোপুরি ডিলিট করবেন? এটি ফেরানো যাবে না।")) return;
    setBusy(id);
    try {
      await adminDeleteStudent({ data: { accessToken: session!.access_token, userId: id } });
      toast.success("মুছে ফেলা হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const resetPw = async () => {
    if (!pwUser || newPw.length < 6) {
      toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষর");
      return;
    }
    try {
      await adminResetPassword({ data: { accessToken: session!.access_token, userId: pwUser.id, newPassword: newPw } });
      toast.success("পাসওয়ার্ড পরিবর্তিত");
      setPwUser(null);
      setNewPw("");
    } catch (e: any) { toast.error(e.message); }
  };

  const createStudent = async () => {
    setAdding(true);
    try {
      await adminCreateStudent({
        data: {
          accessToken: session!.access_token,
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          institution: form.institution.trim(),
          student_id: form.student_id.trim(),
          batch_number: form.batch_number.trim(),
          autoApprove: true,
        },
      });
      toast.success("ছাত্র যোগ হয়েছে ও অনুমোদিত");
      setAddOpen(false);
      setForm({ full_name: "", email: "", phone: "", institution: "", address: "", student_id: "", batch_number: "", password: "" });
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">ব্যবস্থাপনা</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">অনুমোদিত <span className="text-gradient">ছাত্র</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">মোট {students.length} জন</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন..." className="h-11 border-2 pl-10" />
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]">
            <UserPlus className="h-5 w-5" /> নতুন ছাত্র
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">কোনো ছাত্র পাওয়া যায়নি</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s, i) => (
            <Card
              key={s.id}
              className="border-2 p-5 animate-fade-in transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-xl font-extrabold text-primary-foreground shadow">
                  {(s.full_name || s.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-extrabold">{s.full_name || "—"}</p>
                    <Badge className="bg-success/15 text-success-foreground border border-success/30 text-[10px] font-bold uppercase">approved</Badge>
                  </div>
                  <div className="mt-1.5 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                    {s.student_id && <span className="flex items-center gap-1.5"><IdCard className="h-3.5 w-3.5 text-primary" />ID: <strong className="text-foreground">{s.student_id}</strong></span>}
                    {s.batch_number && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" />ব্যাচ: <strong className="text-foreground">{s.batch_number}</strong></span>}
                    {s.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" />{s.email}</span>}
                    {s.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" />{s.phone}</span>}
                    {s.institution && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />{s.institution}</span>}
                    {s.address && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" />{s.address}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to="/course/admin/student/$userId" params={{ userId: s.id }}>
                    <Button size="sm" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow">
                      <Settings2 className="h-4 w-4" /> ভিডিও অ্যাক্সেস
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setPwUser(s)} className="gap-1.5 rounded-full border-2">
                    <KeyRound className="h-4 w-4" /> পাসওয়ার্ড
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => revoke(s.id)} disabled={busy === s.id} className="gap-1.5 rounded-full border-2">
                    <XCircle className="h-4 w-4" /> বাতিল
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(s.id)} disabled={busy === s.id} className="rounded-full border-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন পাসওয়ার্ড</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{pwUser?.full_name || pwUser?.email}</Label>
            <Input type="password" placeholder="নতুন পাসওয়ার্ড" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwUser(null)}>বাতিল</Button>
            <Button onClick={resetPw}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন ছাত্র যোগ করুন</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>পূর্ণ নাম *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>ইমেইল *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>পাসওয়ার্ড * (অন্তত ৬ অক্ষর)</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>স্টুডেন্ট আইডি</Label>
                <Input value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} placeholder="LRN-2025-001" />
              </div>
              <div className="grid gap-1.5">
                <Label>ব্যাচ নাম্বার</Label>
                <Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} placeholder="Batch-12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>ফোন</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>প্রতিষ্ঠান</Label>
                <Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>ঠিকানা</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">এই ছাত্র সরাসরি অনুমোদিত হবে। ভিডিও অ্যাক্সেস পরে দিন।</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>বাতিল</Button>
            <Button onClick={createStudent} disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-4 w-4 animate-spin" />} যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
