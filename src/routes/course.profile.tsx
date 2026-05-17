import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, IdCard, Users, Mail, Network, ShieldCheck, Clock, ShieldAlert, XCircle } from "lucide-react";

export const Route = createFileRoute("/course/profile")({
  component: ProfilePage,
});

interface ProfileRow {
  full_name: string | null;
  phone: string | null;
  address: string | null;
  institution: string | null;
  student_id: string | null;
  batch_number: string | null;
  status: string | null;
  locked_ip: string | null;
}

function ProfilePage() {
  const { user, loading, role } = useAuth();
  const [data, setData] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone,address,institution,student_id,batch_number,status,locked_ip")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setData(
          data ?? {
            full_name: "", phone: "", address: "", institution: "",
            student_id: "", batch_number: "", status: null, locked_ip: null,
          },
        );
      });
  }, [user]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/course/login" />;

  const update = (k: keyof ProfileRow) => (e: any) => setData((d) => d && { ...d, [k]: e.target.value });

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
        institution: data.institution,
        // student_id ও batch_number ছাত্র নিজে পরিবর্তন করতে পারবে না — admin only
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("সংরক্ষিত হয়েছে");
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  const statusBadge = (() => {
    switch (data.status) {
      case "approved":
        return <Badge className="gap-1 bg-success text-success-foreground"><ShieldCheck className="h-3 w-3" /> অনুমোদিত</Badge>;
      case "pending":
        return <Badge className="gap-1 bg-warning text-warning-foreground"><Clock className="h-3 w-3" /> অপেক্ষমাণ</Badge>;
      case "ip_locked":
        return <Badge className="gap-1 bg-destructive text-destructive-foreground"><ShieldAlert className="h-3 w-3" /> IP লক</Badge>;
      case "rejected":
        return <Badge className="gap-1 bg-destructive text-destructive-foreground"><XCircle className="h-3 w-3" /> বাতিল</Badge>;
      default:
        return null;
    }
  })();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-2xl font-extrabold text-primary-foreground shadow-[var(--shadow-glow)]">
            {(data.full_name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold uppercase tracking-widest text-primary">প্রোফাইল</p>
            <h1 className="text-3xl font-extrabold truncate">{data.full_name || "প্রোফাইল"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {statusBadge}
              <Badge variant="outline" className="text-xs">{role === "admin" ? "অ্যাডমিন" : "শিক্ষার্থী"}</Badge>
            </div>
          </div>
        </div>

        {/* Read-only info card */}
        <Card className="mb-5 grid gap-3 border-2 p-5 shadow-[var(--shadow-card)] sm:grid-cols-2">
          <InfoRow icon={Mail} label="ইমেইল" value={user.email ?? "—"} />
          {role !== "admin" && (
            <>
              <InfoRow icon={IdCard} label="স্টুডেন্ট আইডি" value={data.student_id || "—"} />
              <InfoRow icon={Users} label="ব্যাচ" value={data.batch_number || "—"} />
              <InfoRow icon={Network} label="অনুমোদিত IP" value={data.locked_ip || "এখনো লক হয়নি"} mono />
            </>
          )}
        </Card>

        {role !== "admin" && (
          <p className="mb-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            স্টুডেন্ট আইডি, ব্যাচ ও ইমেইল পরিবর্তনের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
        )}

        {/* Editable card */}
        <Card className="space-y-4 border-2 p-6 shadow-[var(--shadow-card)]">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="font-semibold">পূর্ণ নাম</Label>
            <Input id="name" value={data.full_name ?? ""} onChange={update("full_name")} className="h-11 border-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="font-semibold">ফোন</Label>
            <Input id="phone" value={data.phone ?? ""} onChange={update("phone")} className="h-11 border-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="institution" className="font-semibold">প্রতিষ্ঠান</Label>
            <Input id="institution" value={data.institution ?? ""} onChange={update("institution")} className="h-11 border-2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address" className="font-semibold">ঠিকানা</Label>
            <Textarea id="address" value={data.address ?? ""} onChange={update("address")} rows={2} className="border-2" />
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "সংরক্ষণ করুন"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate text-sm font-bold ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
