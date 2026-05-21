-- Manager role + Live class sessions
-- Apply via Supabase SQL Editor (Manual Supabase project)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'manager'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'manager';
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.batch_teachers (
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, teacher_id)
);
ALTER TABLE public.batch_teachers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_link text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 60,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_batch_time
  ON public.class_sessions (batch_id, scheduled_at DESC);
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_teacher_of_batch(_uid uuid, _batch uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.batch_teachers
    WHERE teacher_id = _uid AND batch_id = _batch
  );
$$;

DROP POLICY IF EXISTS cs_admin_mgr_all ON public.class_sessions;
CREATE POLICY cs_admin_mgr_all ON public.class_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

DROP POLICY IF EXISTS cs_teacher_own ON public.class_sessions;
CREATE POLICY cs_teacher_own ON public.class_sessions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'teacher') AND public.is_teacher_of_batch(auth.uid(), batch_id))
  WITH CHECK (public.has_role(auth.uid(),'teacher') AND public.is_teacher_of_batch(auth.uid(), batch_id));

DROP POLICY IF EXISTS cs_student_enrolled ON public.class_sessions;
CREATE POLICY cs_student_enrolled ON public.class_sessions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid() AND e.batch_id = class_sessions.batch_id
    )
  );

DROP POLICY IF EXISTS bt_admin_mgr ON public.batch_teachers;
CREATE POLICY bt_admin_mgr ON public.batch_teachers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

DROP POLICY IF EXISTS bt_self_read ON public.batch_teachers;
CREATE POLICY bt_self_read ON public.batch_teachers
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS batches_teacher_read ON public.batches;
CREATE POLICY batches_teacher_read ON public.batches
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'manager')
    OR public.is_teacher_of_batch(auth.uid(), id)
  );
