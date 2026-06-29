import { motion } from "framer-motion";
import { Loader2, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Leads } from "@/lib/sales-api";
import { STATUS_COLORS } from "@/lib/leads";
import {
  BATCH_OPTIONS,
  BUDGET_OPTIONS,
  getCourseMeta,
  type BatchPreference,
  type BudgetRange,
  type Lead,
  type LeadPriority,
  type LeadSource,
} from "@/lib/leads";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { useSalesSources } from "@/contexts/SalesSourcesContext";
import { useSalesPriorities } from "@/contexts/SalesPrioritiesContext";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (lead: Lead) => void;
  onUpdated?: (lead: Lead) => void;
  lead?: Lead | null;
  isAdmin: boolean;
  currentUserId: string;
  reps: { id: string; full_name: string }[];
}

export function AddLeadModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  lead,
  isAdmin,
  currentUserId,
  reps,
}: Props) {
  const isEditing = Boolean(lead);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const { active: activeSources } = useSalesSources();
  const { active: activePriorities, defaultKey: defaultPriority } = useSalesPriorities();
  const [source, setSource] = useState<LeadSource>("facebook");
  const [campaign, setCampaign] = useState("");
  const [courses, setCourses] = useState<string[]>([]);
  const [courseData, setCourseData] = useState<Record<string, Record<string, unknown>>>({});
  const { active: activeCourses, fieldsFor } = useSalesCourses();
  const [priority, setPriority] = useState<LeadPriority>("high");
  const [childAge, setChildAge] = useState("");
  const [district, setDistrict] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [batch, setBatch] = useState<BatchPreference | "">("");
  const [budget, setBudget] = useState<BudgetRange | "">("");
  // Default: leave unassigned (Intake pool). First sales user to open
  // the lead auto-claims it. Admin can still override below.
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;

    setSaved(false);
    setErrors({});

    if (lead) {
      setFullName(lead.full_name ?? "");
      setPhone(lead.phone ?? "");
      setSecondaryPhone(lead.secondary_phone ?? "");
      setEmail(lead.email ?? "");
      setWhatsapp(lead.whatsapp ?? "");
      setCity(lead.city ?? "");
      setState(lead.state ?? "");
      setSource((lead.source || activeSources[0]?.key || "facebook") as LeadSource);
      setCampaign(lead.campaign_name ?? "");
      setCourses(lead.courses ?? []);
      setCourseData(lead.course_data ?? {});
      setPriority((lead.priority || defaultPriority || "high") as LeadPriority);
      setChildAge(lead.child_age != null ? String(lead.child_age) : "");
      setDistrict(lead.district ?? "");
      setStudentClass(lead.student_class ?? "");
      setBatch(lead.batch_preference ?? "");
      setBudget(lead.budget_range ?? "");
      setAssignedTo(lead.assigned_to ?? "");
      setNote(lead.notes ?? "");
      return;
    }

    reset();
    setAssignedTo("");
    if (activeSources[0]) setSource(activeSources[0].key as LeadSource);
    if (defaultPriority) setPriority(defaultPriority as LeadPriority);
  }, [open, lead?.id, currentUserId, activeSources, defaultPriority]);

  const reset = () => {
    setFullName("");
    setPhone("");
    setSecondaryPhone("");
    setEmail("");
    setWhatsapp("");
    setCity("");
    setState("");
    setSource("facebook");
    setCampaign("");
    setCourses([]);
    setCourseData({});
    setPriority("high");
    setChildAge("");
    setDistrict("");
    setStudentClass("");
    setBatch("");
    setBudget("");
    setNote("");
    setErrors({});
  };

  const submit = async () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = "Name is required";
    if (!phone.trim()) errs.phone = "Phone is required";
    if (!source) errs.source = "Source is required";
    if (courses.length === 0) errs.courses = "Select at least one course";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        secondary_phone: secondaryPhone.trim() || null,
        email: email.trim() || null,
        whatsapp: whatsapp.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        source,
        campaign_name: campaign.trim() || null,
        courses,
        course_data: courseData,
        priority,
        child_age: childAge ? Number(childAge) : null,
        district: district.trim() || null,
        student_class: studentClass.trim() || null,
        batch_preference: batch || null,
        budget_range: budget || null,
        assigned_to: assignedTo || null,
        notes: note.trim() || null,
      };

      const data = lead
        ? await Leads.update(lead.id, payload)
        : await Leads.create(payload);
      setSaved(true);
      toast.success(lead ? "Lead updated successfully" : "Lead added successfully");
      setTimeout(() => {
        if (lead) {
          onUpdated?.(data as unknown as Lead);
        } else {
          onCreated?.(data as unknown as Lead);
          reset();
        }
        onClose();
      }, 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : lead ? "Failed to update lead" : "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = (c: string) => {
    setCourses((arr) =>
      arr.includes(c) ? arr.filter((v) => v !== c) : [...arr, c],
    );
  };

  const setFieldValue = (courseKey: string, fieldKey: string, value: unknown) => {
    setCourseData((prev) => ({
      ...prev,
      [courseKey]: { ...(prev[courseKey] ?? {}), [fieldKey]: value },
    }));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
        }
      }}
    >
      <DialogContent className="sales-sheet max-h-[85vh] max-w-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">
            {isEditing ? "Edit Lead" : "Add New Lead"}
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Section 1: Contact */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground">
              CONTACT INFO
            </h4>
            <div>
              <Label>Full Name *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Anita Sharma"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-rose-500">{errors.fullName}</p>
              )}
            </div>
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-rose-500">{errors.phone}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Secondary Phone</Label>
                <Input
                  value={secondaryPhone}
                  onChange={(e) => setSecondaryPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1">
                <span className="text-emerald-500">●</span> WhatsApp Number
              </Label>
              <Input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 2: Location */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground">LOCATION</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={state} onChange={(e) => setState(e.target.value)} />
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 3: Classification */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground">
              LEAD CLASSIFICATION
            </h4>
            <div>
              <Label>Lead Source *</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activeSources.map((s) => {
                    const Icon = s.icon ? undefined : undefined;
                    return (
                      <SelectItem key={s.key} value={s.key}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                          {s.name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campaign Name</Label>
              <Input
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="e.g. March FB Ad"
              />
            </div>
            <div>
              <Label>Course Interest *</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeCourses.map((co) => {
                  const active = courses.includes(co.key);
                  const meta = getCourseMeta(co.key, activeCourses);
                  return (
                    <button
                      key={co.key}
                      type="button"
                      onClick={() => toggleCourse(co.key)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        active
                          ? cn(meta.bg, meta.text, "border-transparent")
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      <Checkbox checked={active} className="h-3.5 w-3.5" />
                      {co.name}
                    </button>
                  );
                })}
              </div>
              {errors.courses && (
                <p className="mt-1 text-xs text-rose-500">{errors.courses}</p>
              )}
            </div>

            {/* Per-course custom fields */}
            {courses.map((ck) => {
              const fs = fieldsFor(ck);
              if (fs.length === 0) return null;
              const co = activeCourses.find((c) => c.key === ck);
              const meta = getCourseMeta(ck, activeCourses);
              return (
                <div key={ck} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", meta.bg, meta.text)}>
                      {co?.name ?? ck}
                    </span>
                    <span className="text-xs text-muted-foreground">course-specific details</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {fs.map((f) => {
                      const val = (courseData[ck]?.[f.field_key] ?? "") as string;
                      return (
                        <div key={f.id} className={f.field_type === "select" || f.field_type === "date" ? "col-span-2 sm:col-span-1" : ""}>
                          <Label className="text-xs">
                            {f.label}{f.required && " *"}
                          </Label>
                          {f.field_type === "text" && (
                            <Input value={val} onChange={(e) => setFieldValue(ck, f.field_key, e.target.value)} />
                          )}
                          {f.field_type === "number" && (
                            <Input type="number" value={val} onChange={(e) => setFieldValue(ck, f.field_key, e.target.value === "" ? null : Number(e.target.value))} />
                          )}
                          {f.field_type === "date" && (
                            <Input type="date" value={val} onChange={(e) => setFieldValue(ck, f.field_key, e.target.value)} />
                          )}
                          {f.field_type === "select" && (
                            <Select value={val} onValueChange={(v) => setFieldValue(ck, f.field_key, v)}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                {f.options.map((o) => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div>
              <Label>Priority</Label>
              <RadioGroup
                value={priority}
                onValueChange={(v) => setPriority(v as LeadPriority)}
                className="mt-2 flex flex-wrap gap-3"
              >
                {activePriorities.map((p) => {
                  const c = STATUS_COLORS[p.color] ?? STATUS_COLORS.slate;
                  return (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2"
                    >
                      <RadioGroupItem value={p.key} />
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", c.bg, c.text)}>
                        {p.label}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 4: Qualification */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground">
              QUALIFICATION
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Child's Age</Label>
                <Input
                  type="number"
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value)}
                />
              </div>
              <div>
                <Label>District (জেলা)</Label>
                <Input
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Dhaka"
                />
              </div>
              <div>
                <Label>Class (কোন ক্লাসে পড়ে)</Label>
                <Input
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="e.g. Class 6"
                />
              </div>
              <div>
                <Label>Preferred Batch</Label>
                <Select
                  value={batch}
                  onValueChange={(v) => setBatch(v as BatchPreference)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {BATCH_OPTIONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Budget Range</Label>
              <Select
                value={budget}
                onValueChange={(v) => setBudget(v as BudgetRange)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_OPTIONS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <hr className="border-border" />

          {/* Section 5: Assignment (admin) */}
          {isAdmin && (
            <>
              <section className="space-y-4">
                <h4 className="text-sm font-bold text-muted-foreground">
                  ASSIGNMENT
                </h4>
                <div>
                  <Label>Assign To</Label>
                  <Select
                    value={assignedTo || "__unassigned"}
                    onValueChange={(v) => setAssignedTo(v === "__unassigned" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">
                        Unassigned (Intake pool — first opener claims)
                      </SelectItem>
                      {reps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Default: leave unassigned. The first sales person to open
                    the lead auto-claims it.
                  </p>
                </div>
              </section>
              <hr className="border-border" />
            </>
          )}

          {/* Section 6: Note */}
          <section className="space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground">
              {isEditing ? "NOTES" : "INITIAL NOTE"}
            </h4>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Parent called asking about weekend batch"
              rows={3}
            />
          </section>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving || saved}
              className="min-w-[140px]"
            >
              {saved ? (
                <Check className="h-4 w-4" />
              ) : saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                isEditing ? "Save Changes" : "Save Lead →"
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
