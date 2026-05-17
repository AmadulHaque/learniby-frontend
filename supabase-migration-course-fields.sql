-- Course Products: custom per-course fields + per-lead course_data jsonb
-- Backward compatible: existing 3 enum-based courses get a `key` column matching their enum value.

-- 1) Add `key` to sales_courses for stable identifier (matches lead_course enum values for legacy 3)
ALTER TABLE public.sales_courses ADD COLUMN IF NOT EXISTS key text;
UPDATE public.sales_courses SET key = 'abacus_kids' WHERE short_code = 'ABACUS' AND key IS NULL;
UPDATE public.sales_courses SET key = 'teacher_training' WHERE short_code = 'TT' AND key IS NULL;
UPDATE public.sales_courses SET key = 'phonics' WHERE short_code = 'PHONICS' AND key IS NULL;
-- For any future row without a key, derive from short_code lowercase
UPDATE public.sales_courses SET key = lower(regexp_replace(short_code, '[^a-zA-Z0-9]+', '_', 'g')) WHERE key IS NULL;
ALTER TABLE public.sales_courses ALTER COLUMN key SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE public.sales_courses ADD CONSTRAINT sales_courses_key_uniq UNIQUE (key);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL; END $$;

-- 2) Convert leads.courses from lead_course[] enum array to text[] so we can use any course key
ALTER TABLE public.leads ALTER COLUMN courses TYPE text[] USING courses::text[];

-- 3) Per-lead arbitrary course-specific data (keyed by course key)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS course_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4) sales_course_fields — custom fields definition per course
CREATE TABLE IF NOT EXISTS public.sales_course_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.sales_courses(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text','number','select','date')),
  options jsonb NOT NULL DEFAULT '[]'::jsonb,  -- for select: [{"value":"x","label":"X"}]
  required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, field_key)
);
CREATE INDEX IF NOT EXISTS sales_course_fields_course_idx ON public.sales_course_fields(course_id, sort_order);

ALTER TABLE public.sales_course_fields ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_fields: read sales" ON public.sales_course_fields;
CREATE POLICY "course_fields: read sales" ON public.sales_course_fields
  FOR SELECT USING (is_sales_user(auth.uid()) OR is_sales_admin(auth.uid()));

DROP POLICY IF EXISTS "course_fields: admin write" ON public.sales_course_fields;
CREATE POLICY "course_fields: admin write" ON public.sales_course_fields
  USING (is_sales_admin(auth.uid())) WITH CHECK (is_sales_admin(auth.uid()));

-- 5) Seed sample fields for Abacus Kids (so the user sees a working example)
INSERT INTO public.sales_course_fields (course_id, field_key, label, field_type, options, required, sort_order)
SELECT c.id, 'child_age', 'Child Age', 'number', '[]'::jsonb, false, 1
FROM public.sales_courses c WHERE c.key = 'abacus_kids'
ON CONFLICT (course_id, field_key) DO NOTHING;

INSERT INTO public.sales_course_fields (course_id, field_key, label, field_type, options, required, sort_order)
SELECT c.id, 'child_class', 'Child Class', 'select',
  '[{"value":"pre_kg","label":"Pre-KG"},{"value":"kg","label":"KG"},{"value":"class_1_2","label":"Class 1-2"},{"value":"class_3_5","label":"Class 3-5"},{"value":"class_6_plus","label":"Class 6+"}]'::jsonb,
  false, 2
FROM public.sales_courses c WHERE c.key = 'abacus_kids'
ON CONFLICT (course_id, field_key) DO NOTHING;
