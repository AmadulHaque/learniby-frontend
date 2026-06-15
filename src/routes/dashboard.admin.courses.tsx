import { defineRoute, Link } from "@/lib/router-compat";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Search, BookOpen, Upload, Loader2, X } from "lucide-react";

export const Route = defineRoute("/dashboard/admin/courses")({
  component: CoursesPage,
});

interface Course {
  id: string; title: string; description: string | null;
  thumbnail_url: string | null; sort_order: number; is_published: boolean;
}

function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [q, setQ] = useState("");

  const reload = async () => {
    const { data } = await supabase.from("courses").select("*").order("sort_order");
    setCourses(data ?? []);
  };
  useEffect(() => { reload(); }, []);

  const remove = async (id: string) => {
    if (!confirm("কোর্স ও সব ক্লাস/ভিডিও মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("মুছে ফেলা হয়েছে"); reload(); }
  };

  const filtered = courses.filter((c) =>
    !q.trim() ||
    c.title.toLowerCase().includes(q.toLowerCase()) ||
    c.description?.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">কন্টেন্ট</p>
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">কোর্স <span className="text-gradient">ব্যবস্থাপনা</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">মোট {courses.length}টি কোর্স</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setOpen(true); }}
          size="lg"
          className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow-[var(--shadow-glow)]"
        >
          <Plus className="h-5 w-5" /> নতুন কোর্স
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="কোর্স খুঁজুন..." className="h-11 border-2 pl-10" />
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-2 border-dashed p-12 text-center text-sm text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          {courses.length === 0 ? "কোনো কোর্স নেই। উপরে থেকে নতুন কোর্স যোগ করুন।" : `"${q}" এর সাথে মিলে নেই।`}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c, i) => (
            <Card
              key={c.id}
              className="flex flex-wrap items-center gap-4 border-2 p-4 animate-fade-in transition hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-[var(--primary-glow)]/15 to-accent/20">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  <span className="text-2xl font-extrabold text-primary">{c.title[0]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg font-extrabold">{c.title}</h3>
                  {!c.is_published && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase text-warning">খসড়া</span>}
                </div>
                {c.description && <p className="truncate text-sm text-muted-foreground">{c.description}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to="/dashboard/admin/course/$courseId" params={{ courseId: c.id }}>
                  <Button size="sm" className="gap-1.5 rounded-full bg-gradient-to-r from-primary to-[var(--primary-glow)] font-bold shadow">
                    <Plus className="h-4 w-4" /> ক্লাস ও ভিডিও
                  </Button>
                </Link>
                <Button variant="outline" size="icon" onClick={() => { setEditing(c); setOpen(true); }} className="rounded-full border-2">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => remove(c.id)} className="rounded-full border-2 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CourseDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={reload} />
    </div>
  );
}

function CourseDialog({ open, onOpenChange, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; editing: Course | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setThumbnailUrl(editing?.thumbnail_url ?? "");
      setSortOrder(editing?.sort_order ?? 0);
      setIsPublished(editing?.is_published ?? true);
    }
  }, [open, editing]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("শুধু ইমেজ ফাইল"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("সর্বোচ্চ 5MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `courses/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("course-thumbnails").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
      setThumbnailUrl(pub.publicUrl);
      toast.success("আপলোড হয়েছে");
    } catch (e: any) {
      toast.error(e.message || "আপলোড ব্যর্থ");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const payload = {
      title, description: description || null,
      thumbnail_url: thumbnailUrl || null,
      sort_order: sortOrder, is_published: isPublished,
    };
    const { error } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing.id)
      : await supabase.from("courses").insert(payload);
    if (error) toast.error(error.message);
    else { toast.success("সংরক্ষিত"); onOpenChange(false); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "কোর্স সম্পাদনা" : "নতুন কোর্স"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>শিরোনাম</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>বিবরণ</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>

          <div>
            <Label>কভার থাম্বনেইল</Label>
            {thumbnailUrl ? (
              <div className="relative mt-1.5 overflow-hidden rounded-xl border-2 border-primary/30">
                <img src={thumbnailUrl} alt="cover" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl("")}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-destructive shadow"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="mt-1.5 flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 text-sm text-muted-foreground transition hover:border-primary hover:bg-primary/10">
                {uploading ? (
                  <><Loader2 className="h-6 w-6 animate-spin text-primary" /> আপলোড হচ্ছে…</>
                ) : (
                  <><Upload className="h-6 w-6 text-primary" /> ছবি আপলোড করুন (max 5MB)</>
                )}
                <input
                  type="file" accept="image/*" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
            )}
            <Input
              className="mt-2 text-xs"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="অথবা সরাসরি URL পেস্ট করুন"
            />
          </div>

          <div><Label>ক্রম (sort)</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value || "0"))} /></div>
          <div className="flex items-center gap-2"><Switch checked={isPublished} onCheckedChange={setIsPublished} /><Label>প্রকাশিত</Label></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={!title || uploading}>সংরক্ষণ</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
