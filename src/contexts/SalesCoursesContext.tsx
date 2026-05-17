import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { sales } from "@/lib/api";

export interface SalesCourse {
  id: string;
  key: string;
  name: string;
  short_code: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  default_price: number;
  admission_fee: number;
  monthly_fee: number;
}

export interface SalesCourseField {
  id: string;
  course_id: string;
  field_key: string;
  label: string;
  field_type: "text" | "number" | "select" | "date";
  options: { value: string; label: string }[];
  required: boolean;
  sort_order: number;
}

interface Ctx {
  courses: SalesCourse[];
  active: SalesCourse[];
  fields: SalesCourseField[];
  loading: boolean;
  reload: () => Promise<void>;
  fieldsFor: (courseKey: string) => SalesCourseField[];
  byKey: (key: string) => SalesCourse | undefined;
}

const C = createContext<Ctx | null>(null);

export function SalesCoursesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<SalesCourse[]>([]);
  const [fields, setFields] = useState<SalesCourseField[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const courseRows = await sales.taxonomy.courses.list();
      setCourses(courseRows as SalesCourse[]);

      // Backend exposes fields per course; fetch all in parallel.
      const fieldLists = await Promise.all(
        courseRows.map((c) => sales.taxonomy.courseFields.list(c.id).catch(() => [])),
      );
      const allFields = fieldLists.flat().map((x) => ({
        ...x,
        options: Array.isArray(x.options) ? x.options : [],
      })) as SalesCourseField[];
      setFields(allFields);
    } catch {
      setCourses([]);
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = courses.filter((c) => c.is_active);
  const fieldsFor = (key: string) => {
    const c = courses.find((x) => x.key === key);
    if (!c) return [];
    return fields.filter((f) => f.course_id === c.id).sort((a, b) => a.sort_order - b.sort_order);
  };
  const byKey = (k: string) => courses.find((c) => c.key === k);

  return <C.Provider value={{ courses, active, fields, loading, reload: load, fieldsFor, byKey }}>{children}</C.Provider>;
}

export function useSalesCourses() {
  const v = useContext(C);
  if (!v) throw new Error("useSalesCourses must be used inside <SalesCoursesProvider>");
  return v;
}
