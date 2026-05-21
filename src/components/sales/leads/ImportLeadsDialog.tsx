import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Download,
  Plus,
  GitMerge,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Leads, Activities, type LeadWritePayload } from "@/lib/sales-api";
import { cn } from "@/lib/utils";

type FieldKey =
  | "skip"
  | "additional"
  | "full_name"
  | "phone"
  | "secondary_phone"
  | "email"
  | "whatsapp"
  | "city"
  | "state"
  | "source"
  | "campaign_name"
  | "courses"
  | "priority"
  | "child_age"
  | "district"
  | "student_class"
  | "batch_preference"
  | "budget_range"
  | "status"
  | "notes";

const FIELD_OPTIONS: { value: FieldKey; label: string; group: string }[] = [
  { value: "skip", label: "— Skip this column —", group: "Action" },
  { value: "additional", label: "➕ Additional Field (custom)", group: "Action" },
  { value: "full_name", label: "Full Name *", group: "Required" },
  { value: "phone", label: "Phone *", group: "Required" },
  { value: "secondary_phone", label: "Secondary Phone", group: "Contact" },
  { value: "email", label: "Email", group: "Contact" },
  { value: "whatsapp", label: "WhatsApp", group: "Contact" },
  { value: "city", label: "City", group: "Contact" },
  { value: "state", label: "State", group: "Contact" },
  { value: "source", label: "Source", group: "Lead" },
  { value: "campaign_name", label: "Campaign", group: "Lead" },
  { value: "courses", label: "Courses (| separated)", group: "Lead" },
  { value: "priority", label: "Priority", group: "Lead" },
  { value: "status", label: "Status", group: "Lead" },
  { value: "child_age", label: "Child's Age", group: "Qualification" },
  { value: "district", label: "District (জেলা)", group: "Qualification" },
  { value: "student_class", label: "Class (কোন ক্লাসে পড়ে)", group: "Qualification" },
  { value: "batch_preference", label: "Batch Preference", group: "Qualification" },
  { value: "budget_range", label: "Budget Range", group: "Qualification" },
  { value: "notes", label: "Notes", group: "Lead" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];
const BATCH_PREFS = ["morning", "evening", "weekend"];
const BUDGETS = ["under_5k", "5k_10k", "10k_20k", "20k_30k", "above_30k", "not_disclosed"];

/** Normalize a phone for comparison: keep digits only, strip leading "88" or "0". */
function normPhone(s: string | null | undefined): string {
  if (!s) return "";
  let d = String(s).replace(/\D/g, "");
  if (d.startsWith("88")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  return d;
}
function normEmail(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

type DupStrategy = "skip" | "merge" | "create";
type DupExisting = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  courses: string[] | null;
  course_data: Record<string, unknown> | null;
  secondary_phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  campaign_name: string | null;
  child_age: number | null;
  district: string | null;
  student_class: string | null;
  batch_preference: string | null;
  budget_range: string | null;
  priority: string | null;
  additional_fields: Record<string, unknown> | null;
};


// Robust CSV parser supporting quotes, commas, newlines
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  const t = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cur);
        cur = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && t[i + 1] === "\n") i++;
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      } else cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

// Auto-guess mapping from header text
function guessField(header: string): FieldKey {
  const h = header.toLowerCase().trim().replace(/[_\s-]+/g, "");
  const map: Record<string, FieldKey> = {
    name: "full_name",
    fullname: "full_name",
    leadname: "full_name",
    customer: "full_name",
    phone: "phone",
    mobile: "phone",
    contact: "phone",
    phonenumber: "phone",
    secondaryphone: "secondary_phone",
    altphone: "secondary_phone",
    email: "email",
    emailid: "email",
    whatsapp: "whatsapp",
    wa: "whatsapp",
    city: "city",
    state: "state",
    source: "source",
    campaign: "campaign_name",
    campaignname: "campaign_name",
    course: "courses",
    courses: "courses",
    priority: "priority",
    status: "status",
    childage: "child_age",
    age: "child_age",
    district: "district",
    zila: "district",
    jela: "district",
    class: "student_class",
    studentclass: "student_class",
    grade: "student_class",
    standard: "student_class",
    batch: "batch_preference",
    batchpreference: "batch_preference",
    budget: "budget_range",
    budgetrange: "budget_range",
    notes: "notes",
    note: "notes",
    remarks: "notes",
    comments: "notes",
  };
  return map[h] ?? "additional";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  sourcesValid: string[];
  statusesValid: string[];
  coursesValid: string[];
}

export function ImportLeadsDialog({
  open,
  onClose,
  onImported,
  sourcesValid,
  statusesValid,
  coursesValid,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<number, FieldKey>>({});
  const [customNames, setCustomNames] = useState<Record<number, string>>({});
  const [defaultSource, setDefaultSource] = useState<string>("other");
  const [defaultStatus, setDefaultStatus] = useState<string>("new");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  // Duplicate detection (runs when entering Step 3)
  const [dupChecking, setDupChecking] = useState(false);
  const [dupResults, setDupResults] = useState<
    Map<number, { existing: DupExisting; matched_on: string[] }>
  >(new Map());
  const [dupStrategy, setDupStrategy] = useState<DupStrategy>("merge");

  const reset = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setCustomNames({});
    setImporting(false);
    setProgress({ done: 0, total: 0, errors: 0 });
    setDupResults(new Map());
    setDupStrategy("merge");
    setDupChecking(false);
  };

  const handleClose = () => {
    if (importing) return;
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }
    const text = await file.text();
    const parsed = parseCSV(text);
    if (parsed.length < 2) {
      toast.error("CSV needs a header row + at least 1 data row");
      return;
    }
    const hdrs = parsed[0].map((h) => h.trim());
    const data = parsed.slice(1);
    const guess: Record<number, FieldKey> = {};
    const usedRequired = new Set<FieldKey>();
    hdrs.forEach((h, i) => {
      const g = guessField(h);
      // Avoid duplicating required field guesses
      if ((g === "full_name" || g === "phone") && usedRequired.has(g)) {
        guess[i] = "additional";
      } else {
        guess[i] = g;
        if (g === "full_name" || g === "phone") usedRequired.add(g);
      }
    });
    const cn: Record<number, string> = {};
    hdrs.forEach((h, i) => {
      if (guess[i] === "additional") cn[i] = h;
    });
    setFileName(file.name);
    setHeaders(hdrs);
    setRows(data);
    setMapping(guess);
    setCustomNames(cn);
    setStep(2);
  };

  const mappingErrors = useMemo(() => {
    const errs: string[] = [];
    const used = Object.values(mapping);
    if (!used.includes("full_name")) errs.push("Full Name field must be mapped");
    if (!used.includes("phone")) errs.push("Phone field must be mapped");
    // duplicate non-additional/skip
    const counts: Record<string, number> = {};
    used.forEach((v) => {
      if (v !== "skip" && v !== "additional") counts[v] = (counts[v] ?? 0) + 1;
    });
    Object.entries(counts).forEach(([k, v]) => {
      if (v > 1) errs.push(`Field "${k}" mapped to multiple columns`);
    });
    // custom names required
    Object.entries(mapping).forEach(([idx, v]) => {
      if (v === "additional" && !customNames[Number(idx)]?.trim()) {
        errs.push(`Custom name needed for column "${headers[Number(idx)]}"`);
      }
    });
    return errs;
  }, [mapping, customNames, headers]);

  const buildLead = (row: string[]): { lead: any; warnings: string[] } | null => {
    const warnings: string[] = [];
    const additional: Record<string, string> = {};
    const lead: any = {
      source: defaultSource,
      status: defaultStatus,
      priority: "medium",
      courses: [],
      course_data: {},
      additional_fields: {},
    };
    headers.forEach((_h, i) => {
      const field = mapping[i];
      const raw = (row[i] ?? "").trim();
      if (!raw || field === "skip") return;
      if (field === "additional") {
        const k = customNames[i]?.trim();
        if (k) additional[k] = raw;
        return;
      }
      if (field === "courses") {
        const list = raw
          .split(/[|,;]/)
          .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
          .filter(Boolean)
          .filter((c) => coursesValid.includes(c));
        lead.courses = list;
        return;
      }
      if (field === "child_age") {
        const n = parseInt(raw, 10);
        if (!isNaN(n)) lead.child_age = n;
        return;
      }
      if (field === "priority") {
        const v = raw.toLowerCase();
        lead.priority = PRIORITIES.includes(v) ? v : "medium";
        return;
      }
      if (field === "batch_preference") {
        const v = raw.toLowerCase();
        if (BATCH_PREFS.includes(v)) lead.batch_preference = v;
        return;
      }
      if (field === "budget_range") {
        const v = raw.toLowerCase().replace(/\s+/g, "_");
        if (BUDGETS.includes(v)) lead.budget_range = v;
        return;
      }
      if (field === "source") {
        const v = raw.toLowerCase();
        lead.source = sourcesValid.includes(v) ? v : defaultSource;
        return;
      }
      if (field === "status") {
        const v = raw.toLowerCase().replace(/\s+/g, "_");
        lead.status = statusesValid.includes(v) ? v : defaultStatus;
        return;
      }
      lead[field] = raw;
    });
    lead.additional_fields = additional;
    if (!lead.full_name || !lead.phone) {
      warnings.push("Missing required full_name/phone");
      return null;
    }
    return { lead, warnings };
  };

  const validRows = useMemo(() => {
    if (mappingErrors.length > 0) return [];
    return rows.map(buildLead).filter(Boolean) as { lead: any; warnings: string[] }[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, customNames, mappingErrors, defaultSource, defaultStatus]);

  const skippedCount = rows.length - validRows.length;
  const dupCount = dupResults.size;
  const trulyNewCount = validRows.length - dupCount;

  // Run duplicate check whenever we enter Step 3 (or validRows change while on it)
  useEffect(() => {
    if (step !== 3 || validRows.length === 0) {
      setDupResults(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      setDupChecking(true);
      // Collect all phones/emails from the import rows
      const phoneSet = new Set<string>();
      const emailSet = new Set<string>();
      validRows.forEach((v) => {
        const lead = v.lead;
        [lead.phone, lead.secondary_phone, lead.whatsapp].forEach((p) => {
          const n = normPhone(p);
          if (n) phoneSet.add(n);
        });
        const e = normEmail(lead.email);
        if (e) emailSet.add(e);
      });
      if (phoneSet.size === 0 && emailSet.size === 0) {
        if (!cancelled) {
          setDupResults(new Map());
          setDupChecking(false);
        }
        return;
      }
      // Fetch existing leads (paged) — for matching + merge
      const all: DupExisting[] = [];
      const PAGE = 500;
      let page = 1;
      // Cap at 20k existing leads to stay safe; org sizes beyond this are rare here
      while (all.length < 20000) {
        try {
          const res = await Leads.list({ per_page: PAGE, page });
          const data = (res.data ?? []) as unknown as DupExisting[];
          if (data.length === 0) break;
          all.push(...data);
          if (data.length < PAGE) break;
          page++;
        } catch {
          break;
        }
      }
      if (cancelled) return;

      // Build lookup indices
      const phoneIdx = new Map<string, DupExisting>();
      const emailIdx = new Map<string, DupExisting>();
      for (const lead of all) {
        for (const p of [lead.phone, lead.secondary_phone, lead.whatsapp]) {
          const n = normPhone(p);
          if (n && !phoneIdx.has(n)) phoneIdx.set(n, lead);
        }
        const e = normEmail(lead.email);
        if (e && !emailIdx.has(e)) emailIdx.set(e, lead);
      }

      const results = new Map<
        number,
        { existing: DupExisting; matched_on: string[] }
      >();
      validRows.forEach((v, i) => {
        const lead = v.lead;
        const reasons: string[] = [];
        let existing: DupExisting | null = null;
        for (const p of [lead.phone, lead.secondary_phone, lead.whatsapp]) {
          const n = normPhone(p);
          if (n && phoneIdx.has(n)) {
            existing = existing ?? phoneIdx.get(n)!;
            reasons.push("phone");
          }
        }
        const e = normEmail(lead.email);
        if (e && emailIdx.has(e)) {
          existing = existing ?? emailIdx.get(e)!;
          reasons.push("email");
        }
        if (existing) {
          results.set(i, {
            existing,
            matched_on: Array.from(new Set(reasons)),
          });
        }
      });

      if (!cancelled) {
        setDupResults(results);
        setDupChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, validRows.length]);

  /** Build a merge patch — only fill empty fields, union courses, bump priority. */
  const buildMergePatch = (incoming: any, ex: DupExisting) => {
    const patch: Record<string, unknown> = {};
    const fillIfEmpty = (key: keyof DupExisting, val: unknown) => {
      if (val == null || val === "") return;
      if ((ex as any)[key] == null || (ex as any)[key] === "") {
        patch[key as string] = val;
      }
    };
    fillIfEmpty("secondary_phone", incoming.secondary_phone);
    fillIfEmpty("whatsapp", incoming.whatsapp);
    fillIfEmpty("email", incoming.email);
    fillIfEmpty("city", incoming.city);
    fillIfEmpty("state", incoming.state);
    fillIfEmpty("campaign_name", incoming.campaign_name);
    fillIfEmpty("child_age", incoming.child_age);
    fillIfEmpty("district", incoming.district);
    fillIfEmpty("student_class", incoming.student_class);
    fillIfEmpty("batch_preference", incoming.batch_preference);
    fillIfEmpty("budget_range", incoming.budget_range);

    // Union courses
    const exCourses = ex.courses ?? [];
    const inCourses: string[] = incoming.courses ?? [];
    const merged = Array.from(new Set([...exCourses, ...inCourses]));
    if (merged.length !== exCourses.length) {
      patch.courses = merged;
      patch.course_data = {
        ...(ex.course_data ?? {}),
        ...(incoming.course_data ?? {}),
      };
    }

    // Bump priority if higher
    const order: Record<string, number> = { low: 1, medium: 2, high: 3, urgent: 4 };
    if ((order[incoming.priority] ?? 0) > (order[ex.priority ?? ""] ?? 0)) {
      patch.priority = incoming.priority;
    }

    // Merge additional_fields
    const exAdd = ex.additional_fields ?? {};
    const inAdd = incoming.additional_fields ?? {};
    const mergedAdd = { ...exAdd, ...inAdd };
    if (Object.keys(mergedAdd).length > Object.keys(exAdd).length) {
      patch.additional_fields = mergedAdd;
    }

    return patch;
  };

  const handleImport = async () => {
    if (mappingErrors.length > 0) {
      toast.error(mappingErrors[0]);
      return;
    }
    if (validRows.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    setImporting(true);
    setProgress({ done: 0, total: validRows.length, errors: 0 });

    // Bucket rows by what we'll do
    const toInsert: any[] = [];
    const toMerge: { lead: any; existing: DupExisting; matched_on: string[] }[] = [];
    let skipped = 0;
    validRows.forEach((v, i) => {
      const dup = dupResults.get(i);
      if (!dup) {
        toInsert.push(v.lead);
      } else if (dupStrategy === "skip") {
        skipped++;
      } else if (dupStrategy === "merge") {
        toMerge.push({ lead: v.lead, existing: dup.existing, matched_on: dup.matched_on });
      } else {
        // create anyway
        toInsert.push(v.lead);
      }
    });

    let done = 0;
    let errors = 0;
    const total = toInsert.length + toMerge.length + skipped;

    // 1) Insert new — fan out in concurrency-limited groups so we don't overwhelm the API
    const BATCH = 20;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((l) => Leads.create(l as LeadWritePayload)),
      );
      for (const r of results) {
        if (r.status === "rejected") {
          errors++;
          console.error("Import row error:", r.reason);
        }
      }
      done += batch.length;
      setProgress({ done, total, errors });
    }

    // 2) Merge into existing
    for (const m of toMerge) {
      const patch = buildMergePatch(m.lead, m.existing);
      if (Object.keys(patch).length > 0) {
        try {
          await Leads.update(m.existing.id, patch as LeadWritePayload);
          // Audit activity
          try {
            await Activities.create(m.existing.id, {
              type: "note_added",
              title: "Lead merged (CSV import)",
              description: `Duplicate row for "${m.lead.full_name || "(no name)"}" merged in (matched on ${m.matched_on.join(", ")}).`,
            });
          } catch {
            /* swallow */
          }
        } catch (e) {
          errors++;
          console.error("Merge error:", e);
        }
      }
      done++;
      setProgress({ done, total, errors });
    }

    // 3) Skipped — count as done
    done += skipped;
    setProgress({ done, total, errors });

    setImporting(false);
    const inserted = toInsert.length - errors;
    const merged = toMerge.length;
    const parts: string[] = [];
    if (inserted > 0) parts.push(`${inserted} new`);
    if (merged > 0) parts.push(`${merged} merged`);
    if (skipped > 0) parts.push(`${skipped} skipped`);
    if (errors > 0) parts.push(`${errors} failed`);
    toast.success(`Import done — ${parts.join(", ") || "no changes"}`);
    onImported();
    setTimeout(() => {
      reset();
      onClose();
    }, 1500);
  };

  const downloadTemplate = () => {
    const csv =
      "Full Name,Phone,Email,WhatsApp,City,Source,Courses,Priority,Child Age,Batch Preference,Budget Range,Notes,Parent Name,School Name,Class\n" +
      "Rahul Sharma,9876543210,rahul@example.com,9876543210,Mumbai,facebook,abacus_kids,high,8,evening,5k_10k,Interested in trial,Mr. Sharma,DPS,Class 3\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leads-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Import Leads from CSV</h2>
                  <p className="text-sm text-white/80">
                    Step {step} of 3 —{" "}
                    {step === 1 ? "Upload File" : step === 2 ? "Map Columns" : "Review & Import"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={importing}
                className="rounded-full p-1.5 hover:bg-white/20 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Stepper */}
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-all",
                    n <= step ? "bg-white" : "bg-white/30",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 && (
              <div className="space-y-6">
                <div
                  onClick={() => fileRef.current?.click()}
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/50 p-12 text-center transition hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="mx-auto mb-4 inline-flex rounded-full bg-blue-100 p-4">
                    <Upload className="h-10 w-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Click to upload CSV
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    or drag & drop · max 10MB
                  </p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                    }}
                  />
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-slate-800">First time?</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Download a sample CSV with all supported fields and example data.
                      </p>
                    </div>
                    <Button onClick={downloadTemplate} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Template
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-blue-900">📌 How it works:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                    <li>Upload your CSV — any column structure works</li>
                    <li>Map each column to a Lead field, or mark as <b>Additional Field</b></li>
                    <li>Extra columns (like Parent Name, Class, Age) become custom fields shown on each lead</li>
                    <li>Required: Full Name + Phone</li>
                  </ul>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-emerald-600">· {rows.length} rows · {headers.length} columns</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Default Source (when blank/invalid)</Label>
                    <Select value={defaultSource} onValueChange={setDefaultSource}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {sourcesValid.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Status</Label>
                    <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {statusesValid.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-600 grid grid-cols-12 gap-3">
                    <div className="col-span-3">CSV Column</div>
                    <div className="col-span-3">Sample Value</div>
                    <div className="col-span-4">Map to Field</div>
                    <div className="col-span-2">Custom Name</div>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100">
                    {headers.map((h, i) => {
                      const sample = rows.find((r) => r[i]?.trim())?.[i] ?? "";
                      const field = mapping[i] ?? "skip";
                      return (
                        <div key={i} className="grid grid-cols-12 gap-3 items-center px-4 py-2.5 hover:bg-slate-50">
                          <div className="col-span-3 font-medium text-sm text-slate-800 truncate">{h || `Column ${i + 1}`}</div>
                          <div className="col-span-3 text-xs text-slate-500 truncate font-mono">{sample.slice(0, 40) || <em>empty</em>}</div>
                          <div className="col-span-4">
                            <Select
                              value={field}
                              onValueChange={(v) => setMapping((m) => ({ ...m, [i]: v as FieldKey }))}
                            >
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FIELD_OPTIONS.map((o) => (
                                  <SelectItem key={o.value} value={o.value} className="text-xs">
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2">
                            {field === "additional" ? (
                              <Input
                                value={customNames[i] ?? ""}
                                onChange={(e) => setCustomNames((c) => ({ ...c, [i]: e.target.value }))}
                                placeholder="Field name"
                                className="h-8 text-xs"
                              />
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mappingErrors.length > 0 && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm">
                    <div className="flex items-center gap-2 font-semibold text-red-800">
                      <AlertCircle className="h-4 w-4" />
                      Fix before continuing:
                    </div>
                    <ul className="mt-1 list-disc pl-6 text-red-700">
                      {mappingErrors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <StatCard label="Total Rows" value={rows.length} color="blue" />
                  <StatCard label="New Leads" value={trulyNewCount} color="emerald" icon={CheckCircle2} />
                  <StatCard label="Duplicates" value={dupCount} color="amber" icon={AlertTriangle} />
                  <StatCard label="Invalid Rows" value={skippedCount} color="rose" icon={AlertCircle} />
                </div>

                {/* Duplicate strategy panel */}
                {dupChecking ? (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking existing leads for duplicates…
                  </div>
                ) : dupCount > 0 ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <div className="mb-3 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700" />
                      <div className="text-sm text-amber-900">
                        <div className="font-bold">
                          {dupCount} row{dupCount > 1 ? "s" : ""} match existing leads (by phone or email).
                        </div>
                        <div className="text-xs">এদের সাথে কী করব ঠিক করুন:</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <DupOption
                        active={dupStrategy === "merge"}
                        onClick={() => setDupStrategy("merge")}
                        icon={GitMerge}
                        title="Merge"
                        desc="Existing lead-এ empty fields + courses যোগ হবে (recommended)"
                      />
                      <DupOption
                        active={dupStrategy === "skip"}
                        onClick={() => setDupStrategy("skip")}
                        icon={X}
                        title="Skip"
                        desc="Duplicate rows ignore হবে, existing leads অপরিবর্তিত থাকবে"
                      />
                      <DupOption
                        active={dupStrategy === "create"}
                        onClick={() => setDupStrategy("create")}
                        icon={Plus}
                        title="Create anyway"
                        desc="নতুন lead হিসেবে insert হবে (duplicate তৈরি করবে)"
                      />
                    </div>

                    {/* List up to 5 duplicate examples */}
                    <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-amber-200 bg-white">
                      <table className="w-full text-xs">
                        <thead className="bg-amber-100/60 text-amber-900">
                          <tr>
                            <th className="px-2 py-1.5 text-left">CSV Row</th>
                            <th className="px-2 py-1.5 text-left">Existing Lead</th>
                            <th className="px-2 py-1.5 text-left">Matched On</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                          {Array.from(dupResults.entries()).slice(0, 8).map(([rowIdx, info]) => {
                            const v = validRows[rowIdx];
                            return (
                              <tr key={rowIdx}>
                                <td className="px-2 py-1.5">
                                  <div className="font-medium">{v.lead.full_name}</div>
                                  <div className="text-[10px] text-slate-500">{v.lead.phone}</div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="font-medium">{info.existing.full_name || "(no name)"}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {info.existing.phone || info.existing.email || "—"}
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  {info.matched_on.map((r) => (
                                    <span key={r} className="mr-1 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                      {r}
                                    </span>
                                  ))}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {dupResults.size > 8 && (
                        <div className="border-t border-amber-100 bg-amber-50 px-2 py-1 text-[10px] text-amber-800">
                          +{dupResults.size - 8} more duplicates…
                        </div>
                      )}
                    </div>
                  </div>
                ) : validRows.length > 0 ? (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    No duplicates found — all rows are new.
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-600">
                    Preview (first 5 rows)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Phone</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validRows.slice(0, 5).map((v, i) => {
                          const dup = dupResults.get(i);
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                {dup ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                    <AlertTriangle className="h-2.5 w-2.5" />
                                    {dupStrategy === "merge" ? "Will merge" : dupStrategy === "skip" ? "Will skip" : "Will duplicate"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    <Plus className="h-2.5 w-2.5" />
                                    New
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-medium">{v.lead.full_name}</td>
                              <td className="px-3 py-2">{v.lead.phone}</td>
                              <td className="px-3 py-2 text-slate-500">{v.lead.email ?? "—"}</td>
                              <td className="px-3 py-2"><span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{v.lead.source}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {importing && (
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-blue-900">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing... {progress.done} / {progress.total}
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50">
            <div className="flex items-center justify-between gap-4 overflow-x-auto px-6 py-4 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-track]:bg-slate-200">
              <div className="text-xs text-slate-500 shrink-0">
                {step === 2 && `${rows.length} rows · ${Object.values(mapping).filter((v) => v === "additional").length} additional fields`}
                {step === 3 && `Importing into ${validRows.length} leads`}
              </div>
              <div className="flex gap-2 shrink-0">
                {step > 1 && !importing && (
                  <Button variant="outline" onClick={() => setStep((s) => (s - 1) as 1 | 2)} className="shrink-0">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    onClick={() => setStep(3)}
                    disabled={mappingErrors.length > 0}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0"
                  >
                    Continue
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0 || dupChecking}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shrink-0 whitespace-nowrap"
                  >
                    {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                    {dupCount > 0
                      ? dupStrategy === "merge"
                        ? `Import ${trulyNewCount} new + Merge ${dupCount}`
                        : dupStrategy === "skip"
                          ? `Import ${trulyNewCount} new (skip ${dupCount})`
                          : `Import ${validRows.length} (incl. ${dupCount} dup)`
                      : `Import ${validRows.length} Leads`}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: "blue" | "emerald" | "amber" | "rose";
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const colors = {
    blue: "from-blue-500 to-indigo-500",
    emerald: "from-emerald-500 to-teal-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-pink-500",
  };
  return (
    <div className={cn("rounded-xl bg-gradient-to-br p-4 text-white", colors[color])}>
      <div className="flex items-center gap-2 text-xs font-medium opacity-90">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  );
}

function DupOption({
  active,
  onClick,
  icon: Icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border p-3 text-left transition",
        active
          ? "border-amber-600 bg-white shadow-sm ring-2 ring-amber-300"
          : "border-amber-200 bg-white/60 hover:bg-white",
      )}
    >
      <div className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <div className="mt-0.5 text-[11px] text-amber-800/80 leading-snug">{desc}</div>
    </button>
  );
}
