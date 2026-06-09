import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminListStudents,
  adminCreateTeacher,
  adminRevokeTeacher,
  adminDeleteStudent,
  adminResetPassword,
} from "@/rpc/admin";
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
  Search, Loader2, UserPlus, Mail, Phone, Building2, Briefcase, Trash2, KeyRound, ShieldOff, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/admin/teachers")({
  component: TeachersPage,
});

interface Teacher {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  institution: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  is_master?: boolean;
}

function TeachersPage() {
  const { session, isMaster } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [pwUser, setPwUser] = useState<Teacher | null>(null);
  const [newPw, setNewPw] = useState("");

  const reload = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const { students } = await adminListStudents({
        data: { accessToken: session.access_token, status: "approved", roleFilter: "teacher" },
      });
      setTeachers(students as Teacher[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (isMaster) reload(); }, [session?.access_token, isMaster]);

  if (!isMaster) return <Navigate to="/dashboard/admin" />;


  const filtered = teachers.filter((t) =>
    !q.trim() ||
    [t.full_name, t.email, t.phone, t.institution].some((x) => x?.toLowerCase().includes(q.toLowerCase())),
  );

  const create = async () => {
    setAdding(true);
    try {
      await adminCreateTeacher({
        data: {
          accessToken: session!.access_token,
          email: form.email.trim(),
          password: form.password,
          full_name: form.full_name.trim(),
          phone: form.phone.trim(),
        },
      });
      toast.success("শিক্ষক যোগ হয়েছে");
      setAddOpen(false);
      setForm({ full_name: "", email: "", phone: "", password: "" });
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("এই শিক্ষকের অ্যাডমিন এক্সেস বাতিল করবেন? অ্যাকাউন্ট থাকবে কিন্তু শিক্ষক রোল মুছে যাবে।")) return;
    setBusy(id);
    try {
      await adminRevokeTeacher({ data: { accessToken: session!.access_token, userId: id } });
      toast.success("শিক্ষক রোল বাতিল হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("শিক্ষক অ্যাকাউন্ট পুরোপুরি ডিলিট করবেন?")) return;
    setBusy(id);
    try {
      await adminDeleteStudent({ data: { accessToken: session!.access_token, userId: id } });
      toast.success("মুছে ফেলা হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const resetPw = async () => {
    if (!pwUser || newPw.length < 6) { toast.error("পাসওয়ার্ড অন্তত ৬ অক্ষর"); return; }
    try {
      await adminResetPassword({ data: { accessToken: session!.access_token, userId: pwUser.id, newPassword: newPw } });
      toast.success("পাসওয়ার্ড পরিবর্তিত");
      setPwUser(null); setNewPw("");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow-lg">
            <Briefcase className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">মাস্টার অ্যাডমিন</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">শিক্ষক <span className="text-gradient">ব্যবস্থাপনা</span></h1>
            <p className="text-sm text-muted-foreground">{teachers.length} জন অনুমোদিত শিক্ষক</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন..." className="h-11 border-2 pl-10" />
          </div>
          <Button onClick={() => setAddOpen(true)} size="lg" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]">
            <UserPlus className="h-5 w-5" /> নতুন শিক্ষক
          </Button>
        </div>
      </div>

      <Card className="mb-5 border-2 border-primary/30 bg-primary/5 p-4 text-sm">
        💡 শিক্ষকরা অ্যাডমিন প্যানেলের সব কিছু করতে পারবেন — কোর্স/ভিডিও আপলোড, ছাত্র অনুমোদন, ভিডিও অ্যাক্সেস দেওয়া। কিন্তু নতুন শিক্ষক অনুমোদন/বাতিল শুধু আপনি (মাস্টার অ্যাডমিন) করতে পারবেন।
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">কোনো শিক্ষক যোগ হয়নি। নতুন শিক্ষক যোগ করতে উপরের বাটনে ক্লিক করুন অথবা শিক্ষকদের /register পেজে গিয়ে "শিক্ষক" মোডে রেজিস্ট্রেশন করতে বলুন।</Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((t, i) => (
            <Card
              key={t.id}
              className="border-2 p-5 animate-fade-in transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-xl font-extrabold text-primary-foreground shadow">
                  {(t.full_name || t.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-extrabold">{t.full_name || "—"}</p>
                    <Badge className="gap-1 bg-primary text-primary-foreground"><ShieldCheck className="h-3 w-3" /> শিক্ষক</Badge>
                  </div>
                  <div className="mt-1.5 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
                    {t.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" />{t.email}</span>}
                    {t.phone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-primary" />{t.phone}</span>}
                    {t.institution && <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-primary" />{t.institution}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPwUser(t)} className="gap-1.5 rounded-full border-2">
                    <KeyRound className="h-4 w-4" /> পাসওয়ার্ড
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => revoke(t.id)} disabled={busy === t.id} className="gap-1.5 rounded-full border-2">
                    <ShieldOff className="h-4 w-4" /> এক্সেস বাতিল
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => remove(t.id)} disabled={busy === t.id} className="rounded-full border-2 text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন শিক্ষক যোগ করুন</DialogTitle>
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
              <Label>ফোন</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>পাসওয়ার্ড * (অন্তত ৬ অক্ষর)</Label>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">শিক্ষক সরাসরি অ্যাডমিন প্যানেল ব্যবহার করতে পারবেন।</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={adding}>বাতিল</Button>
            <Button onClick={create} disabled={adding} className="gap-1.5">
              {adding && <Loader2 className="h-4 w-4 animate-spin" />} যোগ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
