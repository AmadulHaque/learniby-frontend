import { defineRoute, Navigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { StudentShell } from "@/components/course/StudentShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Clock, ShieldAlert, XCircle, Pencil, X } from "lucide-react";

export const Route = defineRoute("/dashboard/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "প্রোফাইল — Learniby" }] }),
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

type TabKey = "profile" | "results";

function ProfilePage() {
  const { user, loading, role } = useAuth();
  const [data, setData] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<TabKey>("profile");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name,phone,address,institution,student_id,batch_number,status,locked_ip")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setData(
          data ?? {
            full_name: "",
            phone: "",
            address: "",
            institution: "",
            student_id: "",
            batch_number: "",
            status: null,
            locked_ip: null,
          },
        ),
      );
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" />;

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
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("সংরক্ষিত হয়েছে");
      setEditing(false);
    }
  };

  const statusBadge = (() => {
    switch (data?.status) {
      case "approved":
        return <Badge className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          <ShieldCheck className="h-3 w-3" /> Verified
        </Badge>;
      case "pending":
        return <Badge className="gap-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
          <Clock className="h-3 w-3" /> Pending
        </Badge>;
      case "ip_locked":
        return <Badge className="gap-1 bg-rose-100 text-rose-700 hover:bg-rose-100">
          <ShieldAlert className="h-3 w-3" /> Locked
        </Badge>;
      case "rejected":
        return <Badge className="gap-1 bg-rose-100 text-rose-700 hover:bg-rose-100">
          <XCircle className="h-3 w-3" /> Rejected
        </Badge>;
      default:
        return null;
    }
  })();

  const displayName = data?.full_name || user.email?.split("@")[0] || "প্রোফাইল";
  const initial = displayName.charAt(0).toUpperCase();
  const studentIdShort = data?.student_id || (user.id ? user.id.slice(0, 6).toUpperCase() : "—");

  return (
    <StudentShell>
      <div className="space-y-5">
        {!data ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm">
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl font-extrabold text-slate-600">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-extrabold text-slate-900">{displayName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {statusBadge}
                  <Badge variant="outline" className="text-xs">
                    {role === "admin" ? "Admin" : "Student"}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="rounded-2xl bg-white shadow-sm">
              <div className="flex gap-6 border-b border-slate-100 px-6">
                <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>
                  My Profile
                </TabBtn>
                <TabBtn active={tab === "results"} onClick={() => setTab("results")}>
                  My Results
                </TabBtn>
              </div>

              {tab === "profile" ? (
                <div className="p-6">
                  {/* Profile Update header with Edit button */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-extrabold text-slate-900">Profile Update</h2>
                    {!editing ? (
                      <Button
                        onClick={() => setEditing(true)}
                        className="gap-2 bg-[#7B1CB8] text-white hover:brightness-110"
                      >
                        <Pencil className="h-4 w-4" /> Edit Profile
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setEditing(false)}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                  </div>

                  {!editing ? (
                    <Card className="mt-5 divide-y divide-slate-100 border-slate-100 shadow-none">
                      <Row label="Name" value={data.full_name || "N/A"} />
                      <Row label="Student ID" value={studentIdShort} />
                      <Row label="Father Name" value="N/A" />
                      <Row label="Mother Name" value="N/A" />
                      <Row label="Phone Number" value={data.phone || "N/A"} />
                      <Row label="Email" value={user.email ?? "N/A"} />
                      <Row label="Gender" value="N/A" />
                      <Row label="Guardian Mobile Number" value="N/A" />
                      <Row label="WhatsApp Number" value="N/A" />
                      <Row label="Date Of Birth" value="N/A" />
                      <Row label="Religion" value="N/A" />
                      <Row label="Location" value="N/A" />
                      <Row label="School" value={data.institution || "N/A"} />
                      <Row label="Medium" value="N/A" />
                      <Row label="Class" value={data.batch_number || "N/A"} />
                      <Row label="Present Address" value={data.address || "N/A"} />
                      <Row label="Currier Address" value="N/A" />
                    </Card>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field label="পূর্ণ নাম">
                        <Input
                          value={data.full_name ?? ""}
                          onChange={(e) => setData({ ...data, full_name: e.target.value })}
                          className="h-11"
                        />
                      </Field>
                      <Field label="ফোন">
                        <Input
                          value={data.phone ?? ""}
                          onChange={(e) => setData({ ...data, phone: e.target.value })}
                          className="h-11"
                        />
                      </Field>
                      <Field label="প্রতিষ্ঠান / School">
                        <Input
                          value={data.institution ?? ""}
                          onChange={(e) => setData({ ...data, institution: e.target.value })}
                          className="h-11"
                        />
                      </Field>
                      <Field label="ক্লাস / Batch">
                        <Input value={data.batch_number ?? ""} disabled className="h-11" />
                      </Field>
                      <div className="sm:col-span-2">
                        <Field label="ঠিকানা">
                          <Textarea
                            value={data.address ?? ""}
                            onChange={(e) => setData({ ...data, address: e.target.value })}
                            rows={2}
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setEditing(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={save}
                          disabled={saving}
                          className="bg-[#7B1CB8] text-white hover:brightness-110"
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
                        </Button>
                      </div>
                      <p className="sm:col-span-2 mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                        Student ID, Batch ও ইমেইল পরিবর্তনের জন্য অ্যাডমিনের সাথে যোগাযোগ করুন।
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid place-items-center px-6 py-20 text-center text-slate-500">
                  <Clock className="h-10 w-10 text-slate-300" />
                  <p className="mt-3">এখনো কোনো পরীক্ষার রেজাল্ট নেই।</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </StudentShell>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative px-1 py-4 text-[15px] font-bold transition",
        active ? "text-[#7B1CB8]" : "text-slate-500 hover:text-slate-700",
      ].join(" ")}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[#7B1CB8]" />
      )}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[260px_1fr] sm:items-center">
      <p className="text-[13px] font-semibold text-slate-600">{label}</p>
      <p className="text-[14px] text-slate-900 break-words">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-semibold">{label}</Label>
      {children}
    </div>
  );
}
