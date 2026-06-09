import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { adminListBatches, adminBulkGrantBatch } from "@/rpc/bulk";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, PlayCircle, ChevronLeft, Layers, Users, Loader2 } from "lucide-react";
import { extractYouTubeId, youtubeThumbnail, fetchYouTubeOEmbed, fmtDuration } from "@/lib/youtube";

export const Route = createFileRoute("/dashboard/admin/course/$courseId")({
  component: CourseDetail,
});

interface Module { id: string; title: string; description: string | null; sort_order: number; batch_number: string | null; }
interface Video {
  id: string; module_id: string; title: string; description: string | null;
  youtube_id: string; duration_seconds: number | null; sort_order: number;
}

function CourseDetail() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<{ title: string } | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [videosByModule, setVideosByModule] = useState<Record<string, Video[]>>({});

  const reload = async () => {
    const { data: c } = await supabase.from("courses").select("title").eq("id", courseId).maybeSingle();
    setCourse(c);
    const { data: m } = await supabase.from("modules").select("*").eq("course_id", courseId).order("sort_order");
    setModules(m ?? []);
    if (m && m.length) {
      const ids = m.map((x) => x.id);
      const { data: v } = await supabase.from("videos").select("*").in("module_id", ids).order("sort_order");
      const grouped: Record<string, Video[]> = {};
      (v ?? []).forEach((vid) => {
        (grouped[vid.module_id] = grouped[vid.module_id] ?? []).push(vid);
      });
      setVideosByModule(grouped);
    } else setVideosByModule({});
  };
  useEffect(() => { reload(); }, [courseId]);

  const toBn = (n: number) => n.toString().replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[+d]);

  return (
    <div>
      <Link to="/dashboard/admin/courses" className="mb-4 inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-primary/40 hover:text-primary">
        <ChevronLeft className="h-4 w-4" /> সব কোর্স
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">কোর্স</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{course?.title ?? "..."}</h1>
          <p className="mt-1 text-sm text-muted-foreground">মোট {toBn(modules.length)}টি ক্লাস</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkGrantDialog courseId={courseId} modules={modules} />
          <ModuleDialog courseId={courseId} nextOrder={modules.length} onSaved={reload} />
        </div>
      </div>

      {modules.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          এই কোর্সে এখনো কোনো ক্লাস নেই। উপরে থেকে নতুন ক্লাস যোগ করুন।
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((m, mi) => (
            <Card key={m.id} className="overflow-hidden border-2 p-0 transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between gap-2 border-b-2 bg-gradient-to-r from-primary/10 to-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground shadow">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-primary">ক্লাস {toBn(mi + 1)}</p>
                      {m.batch_number && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground shadow-lime">
                          ব্যাচ {m.batch_number}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold">{m.title}</h3>
                    {m.description && <p className="mt-0.5 text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <ModuleDialog courseId={courseId} editing={m} onSaved={reload} />
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={async () => {
                    if (!confirm("ক্লাস ও সব ভিডিও মুছবেন?")) return;
                    const { error } = await supabase.from("modules").delete().eq("id", m.id);
                    if (error) toast.error(error.message); else { toast.success("মুছে ফেলা হয়েছে"); reload(); }
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="divide-y-2 divide-border/50">
                {(videosByModule[m.id] ?? []).map((v, i) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 transition hover:bg-primary/5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-extrabold text-primary">{toBn(i + 1)}</span>
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/60">
                      <img src={youtubeThumbnail(v.youtube_id, "mq")} alt="" className="h-full w-full object-cover" loading="lazy" />
                      <PlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {v.duration_seconds ? fmtDuration(v.duration_seconds) : "সময়কাল নেই"}
                      </p>
                    </div>
                    <VideoDialog moduleId={m.id} editing={v} onSaved={reload} />
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={async () => {
                      if (!confirm("ভিডিও মুছবেন?")) return;
                      const { error } = await supabase.from("videos").delete().eq("id", v.id);
                      if (error) toast.error(error.message); else { toast.success("মুছে ফেলা হয়েছে"); reload(); }
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="bg-muted/20 p-3">
                  <VideoDialog moduleId={m.id} nextOrder={(videosByModule[m.id] ?? []).length} onSaved={reload} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ModuleDialog({ courseId, editing, nextOrder, onSaved }: { courseId: string; editing?: Module; nextOrder?: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [batchNumber, setBatchNumber] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setSortOrder(editing?.sort_order ?? nextOrder ?? 0);
      setBatchNumber(editing?.batch_number ?? "");
    }
  }, [open, editing, nextOrder]);

  const save = async () => {
    const payload = {
      course_id: courseId,
      title,
      description: description || null,
      sort_order: sortOrder,
      batch_number: batchNumber.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("modules").update(payload).eq("id", editing.id)
      : await supabase.from("modules").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("সংরক্ষিত"); setOpen(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon" className="rounded-full"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="lg" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]"><Plus className="h-5 w-5" /> নতুন ক্লাস</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "ক্লাস সম্পাদনা" : "নতুন ক্লাস"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>ক্লাসের শিরোনাম</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="যেমন: ভূমিকা" /></div>
          <div><Label>বিবরণ</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>ক্রম (ক্লাস নম্বর)</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0"))} /></div>
            <div>
              <Label>ব্যাচ নাম্বার (ঐচ্ছিক)</Label>
              <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="যেমন: Batch-12" />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">ক্লাস যোগ করার পর ভেতরে ভিডিও যোগ করুন।</p>
        </div>
        <DialogFooter><Button onClick={save} disabled={!title}>সংরক্ষণ</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VideoDialog({ moduleId, editing, nextOrder, onSaved }: { moduleId: string; editing?: Video; nextOrder?: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [duration, setDuration] = useState<number | "">("");
  const [sortOrder, setSortOrder] = useState(0);
  const [fetching, setFetching] = useState(false);

  const yid = extractYouTubeId(youtubeInput);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setYoutubeInput(editing?.youtube_id ?? "");
      setDuration(editing?.duration_seconds ?? "");
      setSortOrder(editing?.sort_order ?? nextOrder ?? 0);
    }
  }, [open, editing, nextOrder]);

  // Auto-fetch title when YouTube ID becomes valid (only when adding & title empty)
  useEffect(() => {
    if (!open || editing || !yid || title.trim()) return;
    let cancelled = false;
    setFetching(true);
    fetchYouTubeOEmbed(yid).then((res) => {
      if (cancelled || !res) return;
      if (!title.trim()) setTitle(res.title);
    }).finally(() => !cancelled && setFetching(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yid, open]);

  const save = async () => {
    if (!yid) { toast.error("সঠিক YouTube URL/ID দিন"); return; }
    const payload = {
      module_id: moduleId,
      title,
      description: description || null,
      youtube_id: yid,
      duration_seconds: duration === "" ? null : Number(duration),
      sort_order: sortOrder,
    };
    const { error } = editing
      ? await supabase.from("videos").update(payload).eq("id", editing.id)
      : await supabase.from("videos").insert(payload);
    if (error) toast.error(error.message); else { toast.success("সংরক্ষিত"); setOpen(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full border-2 border-dashed"><Plus className="mr-1 h-4 w-4" /> ভিডিও যোগ</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "ভিডিও সম্পাদনা" : "নতুন ভিডিও"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>YouTube URL বা ID *</Label>
            <Input
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="https://youtu.be/... অথবা 11-অক্ষরের ID"
              autoFocus
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              পুরো URL পেস্ট করুন — ID স্বয়ংক্রিয়ভাবে বের করা হবে।
            </p>
          </div>

          {yid && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3">
              <div className="flex gap-3">
                <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-muted ring-2 ring-border">
                  <img
                    src={youtubeThumbnail(yid, "mq")}
                    alt="thumbnail"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = youtubeThumbnail(yid, "hq"); }}
                  />
                  <PlayCircle className="absolute inset-0 m-auto h-8 w-8 text-white drop-shadow-lg" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">প্রিভিউ</p>
                  <p className="mt-1 truncate font-mono text-xs">{yid}</p>
                  {fetching && <p className="text-[11px] text-muted-foreground">শিরোনাম আনছি…</p>}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label>শিরোনাম *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={fetching ? "YouTube থেকে আনছি…" : "ভিডিওর নাম"} />
          </div>
          <div><Label>বিবরণ</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>সময়কাল (সেকেন্ড)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value === "" ? "" : parseInt(e.target.value))} placeholder="ঐচ্ছিক" />
            </div>
            <div><Label>ক্রম</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0"))} /></div>
          </div>
          <p className="text-[11px] text-muted-foreground">সময়কাল দিলে শিক্ষার্থীর কার্ডে দেখা যাবে। না দিলেও ভিডিও কাজ করবে।</p>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!title || !yid}>সংরক্ষণ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkGrantDialog({ courseId, modules }: { courseId: string; modules: Module[] }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState<{ batch: string; count: number }[]>([]);
  const [batch, setBatch] = useState("");
  const [moduleId, setModuleId] = useState<string>("__all__");
  const [loading, setLoading] = useState(false);
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!open || !session?.access_token) return;
    setLoading(true);
    adminListBatches({ data: { accessToken: session.access_token } })
      .then((r) => setBatches(r.batches))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, session?.access_token]);

  const grant = async () => {
    if (!session?.access_token || !batch) return;
    setGranting(true);
    try {
      const r = await adminBulkGrantBatch({
        data: {
          accessToken: session.access_token,
          batchNumber: batch,
          courseId,
          moduleId: moduleId === "__all__" ? undefined : moduleId,
        },
      });
      toast.success("বাল্ক অ্যাক্সেস দেওয়া হয়েছে", {
        description: `${r.students} ছাত্র × ${r.videos} ভিডিও — নতুন গ্রান্ট: ${r.granted}`,
      });
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGranting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="gap-1.5 rounded-full border-2 font-bold">
          <Users className="h-5 w-5" /> ব্যাচকে অ্যাক্সেস
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>একটি ব্যাচকে অ্যাক্সেস দিন</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            নির্বাচিত ব্যাচের সব অনুমোদিত ছাত্রকে এই কোর্সের ভিডিও অ্যাক্সেস দেওয়া হবে।
          </p>

          <div>
            <Label>ব্যাচ</Label>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> লোড হচ্ছে…</div>
            ) : batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">কোনো ব্যাচ পাওয়া যায়নি। আগে ছাত্রদের ব্যাচ নাম্বার দিন।</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap gap-2">
                {batches.map((b) => (
                  <button
                    key={b.batch}
                    type="button"
                    onClick={() => setBatch(b.batch)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${
                      batch === b.batch
                        ? "border-primary bg-primary text-primary-foreground shadow"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    {b.batch} <span className="opacity-70">({b.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>স্কোপ</Label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border-2 border-input bg-background px-3 text-sm"
            >
              <option value="__all__">পুরো কোর্সের সব ক্লাস ও ভিডিও</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>শুধু ক্লাস: {m.title}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={grant} disabled={!batch || granting} className="gap-1.5">
            {granting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            অ্যাক্সেস দিন
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
