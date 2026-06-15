import { defineRoute, Link, useNavigate } from "@/lib/router-compat";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { adminGetStudentAccess, adminSetVideoAccess } from "@/rpc/admin";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ChevronLeft, Loader2, Save, BookOpen, ChevronDown, ChevronUp, CheckCheck, Square, Search, PlayCircle,
} from "lucide-react";

export const Route = defineRoute("/dashboard/admin/student/$userId")({
  component: StudentAccessPage,
});

interface Video { id: string; title: string; assigned: boolean; }
interface Module { id: string; title: string; videos: Video[]; }
interface Course {
  id: string; title: string; modules: Module[]; totalVideos: number; assignedCount: number;
}

function StudentAccessPage() {
  const { userId } = Route.useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [tree, setTree] = useState<Course[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null } | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      setLoading(true);
      try {
        const [{ tree }, { data: prof }] = await Promise.all([
          adminGetStudentAccess({ data: { accessToken: session.access_token, userId } }),
          supabase.from("profiles").select("full_name,email").eq("id", userId).maybeSingle(),
        ]);
        setTree(tree as Course[]);
        setProfile(prof);
        const ids = new Set<string>();
        (tree as Course[]).forEach((c) => c.modules.forEach((m) => m.videos.forEach((v) => v.assigned && ids.add(v.id))));
        setSelected(ids);
        setInitial(new Set(ids));
        // auto-open courses that already have any access
        setOpenCourses(new Set((tree as Course[]).filter((c) => c.assignedCount > 0).map((c) => c.id)));
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, session?.access_token]);

  const toggleVideo = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleCourse = (course: Course, on: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      course.modules.forEach((m) => m.videos.forEach((v) => on ? n.add(v.id) : n.delete(v.id)));
      return n;
    });
  };

  const toggleModule = (mod: Module, on: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      mod.videos.forEach((v) => on ? n.add(v.id) : n.delete(v.id));
      return n;
    });
  };

  const toggleOpen = (id: string) => {
    setOpenCourses((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const dirty = useMemo(() => {
    if (selected.size !== initial.size) return true;
    for (const id of selected) if (!initial.has(id)) return true;
    return false;
  }, [selected, initial]);

  const save = async () => {
    if (!session?.access_token) return;
    setSaving(true);
    try {
      const r = await adminSetVideoAccess({
        data: { accessToken: session.access_token, userId, videoIds: [...selected] },
      });
      toast.success(`সংরক্ষিত ✓`, { description: `+${r.added} নতুন, -${r.removed} বাতিল` });
      setInitial(new Set(selected));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalVideos = tree.reduce((n, c) => n + c.totalVideos, 0);

  const filteredTree = useMemo(() => {
    if (!q.trim()) return tree;
    const t = q.toLowerCase();
    return tree
      .map((c) => ({
        ...c,
        modules: c.modules
          .map((m) => ({
            ...m,
            videos: m.videos.filter((v) =>
              v.title.toLowerCase().includes(t) ||
              m.title.toLowerCase().includes(t) ||
              c.title.toLowerCase().includes(t),
            ),
          }))
          .filter((m) => m.videos.length > 0),
      }))
      .filter((c) => c.modules.length > 0);
  }, [tree, q]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 pb-24">
      <button onClick={() => navigate({ to: "/dashboard/admin/students" })} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> ছাত্র লিস্টে ফিরে যান
      </button>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[var(--primary-glow)] text-2xl font-bold text-primary-foreground shadow">
            {(profile?.full_name || profile?.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{profile?.full_name || "—"}</h1>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2">
            <PlayCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{selected.size}/{totalVideos}</span>
            <span className="text-xs text-muted-foreground">ভিডিও অ্যাক্সেস</span>
          </div>
        </div>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="কোর্স / ক্লাস / ভিডিও খুঁজুন..." className="pl-9" />
      </div>

      {filteredTree.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          {tree.length === 0 ? (
            <>কোনো কোর্স তৈরি হয়নি। প্রথমে <Link to="/dashboard/admin/courses" className="font-semibold text-primary hover:underline">কোর্স যোগ করুন</Link>।</>
          ) : "মিল পাওয়া যায়নি"}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTree.map((c) => {
            const courseSelected = c.modules.reduce(
              (n, m) => n + m.videos.filter((v) => selected.has(v.id)).length, 0,
            );
            const courseTotal = c.modules.reduce((n, m) => n + m.videos.length, 0);
            const allOn = courseSelected === courseTotal && courseTotal > 0;
            const partial = courseSelected > 0 && courseSelected < courseTotal;
            const isOpen = openCourses.has(c.id);

            return (
              <Card key={c.id} className="overflow-hidden p-0">
                <div className="flex items-center gap-3 border-b bg-muted/30 p-4">
                  <button onClick={() => toggleOpen(c.id)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-background">
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <BookOpen className="h-5 w-5 text-primary" />
                  <button onClick={() => toggleOpen(c.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-bold">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {courseSelected}/{courseTotal} ভিডিও সিলেক্টেড
                    </p>
                  </button>
                  <Badge variant={allOn ? "default" : partial ? "secondary" : "outline"}>
                    {allOn ? "সব" : partial ? "আংশিক" : "কিছু না"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={allOn ? "outline" : "default"}
                    onClick={() => toggleCourse(c, !allOn)}
                    className="gap-1.5"
                  >
                    {allOn ? <><Square className="h-4 w-4" /> বাদ</> : <><CheckCheck className="h-4 w-4" /> সব</>}
                  </Button>
                </div>

                {isOpen && (
                  <div className="divide-y">
                    {c.modules.map((m) => {
                      const modSel = m.videos.filter((v) => selected.has(v.id)).length;
                      const modAll = modSel === m.videos.length && m.videos.length > 0;
                      return (
                        <div key={m.id} className="bg-background">
                          <div className="flex items-center gap-2 bg-muted/20 px-4 py-2">
                            <p className="flex-1 text-sm font-semibold">{m.title}</p>
                            <span className="text-xs text-muted-foreground">{modSel}/{m.videos.length}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs"
                              onClick={() => toggleModule(m, !modAll)}
                            >
                              {modAll ? "বাদ" : "সব"}
                            </Button>
                          </div>
                          <div className="divide-y">
                            {m.videos.map((v) => (
                              <label
                                key={v.id}
                                className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-muted/40"
                              >
                                <Checkbox
                                  checked={selected.has(v.id)}
                                  onCheckedChange={() => toggleVideo(v.id)}
                                />
                                <PlayCircle className={`h-4 w-4 ${selected.has(v.id) ? "text-primary" : "text-muted-foreground"}`} />
                                <span className={`flex-1 text-sm ${selected.has(v.id) ? "font-medium" : ""}`}>
                                  {v.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 animate-fade-in">
          <Card className="flex items-center gap-3 border-primary/30 bg-background/95 p-3 shadow-[var(--shadow-elegant)] backdrop-blur">
            <p className="flex-1 text-sm">
              <span className="font-semibold">পরিবর্তন রয়েছে</span>
              <span className="ml-1 text-muted-foreground">— {selected.size} ভিডিও সিলেক্টেড</span>
            </p>
            <Button variant="outline" size="sm" onClick={() => setSelected(new Set(initial))}>
              পুনরায় সেট
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সংরক্ষণ
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
