import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  STATUS_COLORS,
  getCourseMeta,
  type LeadCourse,
  type LeadPriority,
  type LeadSource,
  type LeadStatus,
} from "@/lib/leads";
import { useSalesStatuses } from "@/contexts/SalesStatusesContext";
import { useSalesCourses } from "@/contexts/SalesCoursesContext";
import { useSalesSources } from "@/contexts/SalesSourcesContext";
import { useSalesPriorities } from "@/contexts/SalesPrioritiesContext";

export interface LeadFilters {
  statuses: LeadStatus[];
  courses: LeadCourse[];
  sources: LeadSource[];
  priorities: LeadPriority[];
  assignedTo: string | "all";
  dateMode: "added" | "followup";
  dateFrom: string;
  dateTo: string;
}

export const EMPTY_FILTERS: LeadFilters = {
  statuses: [],
  courses: [],
  sources: [],
  priorities: [],
  assignedTo: "all",
  dateMode: "added",
  dateFrom: "",
  dateTo: "",
};

export function countActiveFilters(f: LeadFilters): number {
  return (
    f.statuses.length +
    f.courses.length +
    f.sources.length +
    f.priorities.length +
    (f.assignedTo !== "all" ? 1 : 0) +
    (f.dateFrom ? 1 : 0) +
    (f.dateTo ? 1 : 0)
  );
}

interface SectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, count, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold">
          {title}
          {count ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="space-y-2 px-5 pb-4">{children}</div>}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  filters: LeadFilters;
  onChange: (f: LeadFilters) => void;
  isAdmin: boolean;
  reps: { id: string; full_name: string }[];
}

export function FilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  isAdmin,
  reps,
}: Props) {
  const { active: activeStatuses } = useSalesStatuses();
  const { active: courseList } = useSalesCourses();
  const { active: activeSources } = useSalesSources();
  const { active: activePriorities } = useSalesPriorities();
  const [draft, setDraft] = useState<LeadFilters>(filters);

  // Reset draft when drawer opens
  const drawerKey = open ? "open" : "closed";

  const toggleArr = <T extends string>(key: keyof LeadFilters, value: T) => {
    setDraft((d) => {
      const arr = d[key] as T[];
      return {
        ...d,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      };
    });
  };

  const apply = () => {
    onChange(draft);
    onClose();
  };

  const clearAll = () => {
    setDraft(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/40"
            onClick={onClose}
          />
          <motion.aside
            key={`drawer-${drawerKey}`}
            initial={{ x: 380, y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={{ x: 380, y: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed z-50 flex flex-col bg-card shadow-2xl
                       right-0 top-0 h-full w-[380px] max-w-full
                       max-md:left-0 max-md:right-0 max-md:top-auto max-md:bottom-0
                       max-md:h-[88vh] max-md:w-full max-md:rounded-t-3xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold">Filters</h3>
                {countActiveFilters(draft) > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {countActiveFilters(draft)}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-accent"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Section title="Status" count={draft.statuses.length}>
                {activeStatuses.map((row) => {
                  const c = STATUS_COLORS[row.color] ?? STATUS_COLORS.blue;
                  return (
                    <label
                      key={row.key}
                      className="flex cursor-pointer items-center gap-3 rounded-md py-1.5"
                    >
                      <Checkbox
                        checked={draft.statuses.includes(row.key)}
                        onCheckedChange={() => toggleArr("statuses", row.key)}
                      />
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          c.bg,
                          c.text,
                        )}
                      >
                        {row.label}
                      </span>
                    </label>
                  );
                })}
              </Section>

              <Section title="Course Interest" count={draft.courses.length}>
                {courseList.map((co) => {
                  const m = getCourseMeta(co.key, courseList);
                  return (
                    <label
                      key={co.key}
                      className="flex cursor-pointer items-center gap-3 py-1.5"
                    >
                      <Checkbox
                        checked={draft.courses.includes(co.key)}
                        onCheckedChange={() => toggleArr("courses", co.key)}
                      />
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", m.bg, m.text)}>
                        {co.name}
                      </span>
                    </label>
                  );
                })}
              </Section>

              <Section title="Lead Source" count={draft.sources.length}>
                {activeSources.map((s) => (
                  <label
                    key={s.key}
                    className="flex cursor-pointer items-center gap-3 py-1.5"
                  >
                    <Checkbox
                      checked={draft.sources.includes(s.key as LeadSource)}
                      onCheckedChange={() => toggleArr("sources", s.key as LeadSource)}
                    />
                    <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))}
              </Section>

              {isAdmin && (
                <Section
                  title="Assigned To"
                  count={draft.assignedTo !== "all" ? 1 : 0}
                >
                  <Select
                    value={draft.assignedTo}
                    onValueChange={(v) =>
                      setDraft((d) => ({ ...d, assignedTo: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Anyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {reps.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Section>
              )}

              <Section
                title="Date Range"
                count={(draft.dateFrom ? 1 : 0) + (draft.dateTo ? 1 : 0)}
              >
                <div className="mb-2 inline-flex rounded-lg bg-muted p-0.5 text-xs">
                  {(["added", "followup"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDraft((d) => ({ ...d, dateMode: m }))}
                      className={cn(
                        "rounded-md px-3 py-1.5 font-semibold transition",
                        draft.dateMode === m
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {m === "added" ? "Date Added" : "Follow-up"}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={draft.dateFrom}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, dateFrom: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input
                      type="date"
                      value={draft.dateTo}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, dateTo: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </Section>

              <Section title="Priority" count={draft.priorities.length}>
                {activePriorities.map((p) => {
                  const c = STATUS_COLORS[p.color] ?? STATUS_COLORS.slate;
                  return (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-center gap-3 py-1.5"
                    >
                      <Checkbox
                        checked={draft.priorities.includes(p.key as LeadPriority)}
                        onCheckedChange={() => toggleArr("priorities", p.key as LeadPriority)}
                      />
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", c.bg, c.text)}>
                        {p.label}
                      </span>
                    </label>
                  );
                })}
              </Section>
            </div>

            <div className="border-t border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={clearAll}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Clear All Filters
                </button>
              </div>
              <Button onClick={apply} className="w-full" size="lg">
                Apply Filters
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
