import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminListStudents, adminSetStudentStatus, adminDeleteStudent } from "@/server/admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, CheckCircle2, XCircle, Trash2, Mail, Phone, Building2, MapPin, Loader2, UserPlus, Inbox, ShieldAlert, Network, IdCard, Users, Briefcase,
} from "lucide-react";

export const Route = createFileRoute("/course/admin/pending")({
  component: PendingPage,
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
  locked_ip?: string | null;
  last_attempted_ip?: string | null;
  last_attempt_at?: string | null;
  requested_role?: string | null;
}

function PendingPage() {
  const { session, isMaster } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      // Pull both students and teachers — pending tab shows everything needing attention
      const [{ students: studs }, { students: teachs }] = await Promise.all([
        adminListStudents({ data: { accessToken: session.access_token, status: "pending" } }),
        adminListStudents({ data: { accessToken: session.access_token, status: "pending", roleFilter: "teacher" } }),
      ]);
      const merged = [...(teachs as Student[]), ...(studs as Student[])];
      setStudents(merged);
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
    return [s.full_name, s.email, s.phone, s.institution].some((x) => x?.toLowerCase().includes(t));
  });

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    try {
      await adminSetStudentStatus({ data: { accessToken: session!.access_token, userId: id, status } });
      toast.success(status === "approved" ? "অনুমোদন দেওয়া হয়েছে ✓" : "প্রত্যাখ্যান করা হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const remove = async (id: string) => {
    if (!confirm("পুরোপুরি ডিলিট করবেন?")) return;
    setBusy(id);
    try {
      await adminDeleteStudent({ data: { accessToken: session!.access_token, userId: id } });
      toast.success("মুছে ফেলা হয়েছে");
      reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-warning to-warning/70 text-warning-foreground shadow-lg">
            <UserPlus className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-warning">অপেক্ষায় / IP লক</p>
            <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">অনুমোদন <span className="text-gradient">দরকার</span></h1>
            <p className="text-sm text-muted-foreground">{students.length} জন অনুমোদনের অপেক্ষায়</p>
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="খুঁজুন..." className="h-11 border-2 pl-10" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">সব রেজিস্ট্রেশন প্রসেস হয়ে গেছে!</p>
          <p className="text-sm text-muted-foreground">কোনো অপেক্ষমাণ রেজিস্ট্রেশন নেই।</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((s, i) => (
            <Card
              key={s.id}
              className={`animate-fade-in p-5 ${
                s.status === "ip_locked"
                  ? "border-destructive/30 bg-gradient-to-r from-destructive/10 to-transparent"
                  : "border-warning/20 bg-gradient-to-r from-warning/5 to-transparent"
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] text-xl font-bold text-primary-foreground shadow-md">
                  {(s.full_name || s.email || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-bold">{s.full_name || "—"}</p>
                    {s.requested_role === "teacher" && (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <Briefcase className="h-3 w-3" /> শিক্ষক রিকোয়েস্ট
                      </Badge>
                    )}
                    {s.status === "ip_locked" ? (
                      <Badge className="gap-1 bg-destructive text-destructive-foreground">
                        <ShieldAlert className="h-3 w-3" /> IP লক
                      </Badge>
                    ) : (
                      <Badge className="bg-warning text-warning-foreground">নতুন</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                    {s.student_id && <span className="flex items-center gap-2"><IdCard className="h-3.5 w-3.5 text-primary" />ID: <strong>{s.student_id}</strong></span>}
                    {s.batch_number && <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-primary" />ব্যাচ: <strong>{s.batch_number}</strong></span>}
                    {s.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" />{s.email}</span>}
                    {s.phone && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" />{s.phone}</span>}
                    {s.institution && <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-primary" />{s.institution}</span>}
                    {s.address && <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" />{s.address}</span>}
                  </div>
                  {s.status === "ip_locked" && (
                    <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5 font-semibold text-destructive">
                          <Network className="h-3.5 w-3.5" /> অনুমোদিত IP:
                        </span>
                        <code className="font-mono">{s.locked_ip || "—"}</code>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-semibold text-destructive">নতুন IP চেষ্টা:</span>
                        <code className="font-mono">{s.last_attempted_ip || "—"}</code>
                        {s.last_attempt_at && (
                          <span className="text-muted-foreground">
                            ({new Date(s.last_attempt_at).toLocaleString("bn-BD", { dateStyle: "short", timeStyle: "short" })})
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 text-muted-foreground">
                        অনুমোদন দিলে IP রিসেট হবে — পরবর্তী লগইন যে IP থেকে হবে সেটাই নতুন lock হবে।
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-col">
                  {s.requested_role === "teacher" && !isMaster ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                      শিক্ষক অনুমোদন শুধু মাস্টার অ্যাডমিন করতে পারবেন।
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      onClick={() => setStatus(s.id, "approved")}
                      disabled={busy === s.id}
                      className="flex-1 gap-1.5 bg-success font-bold hover:bg-success/90 text-success-foreground sm:flex-none"
                    >
                      <CheckCircle2 className="h-4 w-4" /> অনুমোদন
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => setStatus(s.id, "rejected")}
                    disabled={busy === s.id}
                    className="flex-1 gap-1.5 sm:flex-none"
                  >
                    <XCircle className="h-4 w-4" /> বাতিল
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(s.id)}
                    disabled={busy === s.id}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
