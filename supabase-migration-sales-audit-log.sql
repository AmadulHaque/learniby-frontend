-- Sales Audit Log: complete who/when/what change history across the sales system.

CREATE TABLE IF NOT EXISTS public.sales_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,
  actor_email TEXT,
  action TEXT NOT NULL,                 -- INSERT | UPDATE | DELETE
  table_name TEXT NOT NULL,
  row_id TEXT,
  changed_fields TEXT[] DEFAULT '{}',
  old_data JSONB,
  new_data JSONB,
  lead_id UUID,                         -- denormalized when applicable, for fast lookup
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_audit_created ON public.sales_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_audit_actor   ON public.sales_audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_sales_audit_table   ON public.sales_audit_log (table_name);
CREATE INDEX IF NOT EXISTS idx_sales_audit_lead    ON public.sales_audit_log (lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_audit_row     ON public.sales_audit_log (table_name, row_id);

ALTER TABLE public.sales_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit admin all"       ON public.sales_audit_log;
DROP POLICY IF EXISTS "audit exec own leads"  ON public.sales_audit_log;
DROP POLICY IF EXISTS "audit insert system"   ON public.sales_audit_log;

-- Admins read everything
CREATE POLICY "audit admin all" ON public.sales_audit_log
  FOR SELECT TO authenticated
  USING (public.is_sales_admin(auth.uid()));

-- Executives can read entries for leads they own
CREATE POLICY "audit exec own leads" ON public.sales_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_sales_user(auth.uid())
    AND lead_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.leads l WHERE l.id = sales_audit_log.lead_id AND l.assigned_to = auth.uid())
  );

-- Allow trigger inserts under any authenticated context (function uses SECURITY DEFINER so this is mostly defensive)
CREATE POLICY "audit insert system" ON public.sales_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Generic trigger function -------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sales_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_email TEXT;
  v_old   JSONB;
  v_new   JSONB;
  v_changed TEXT[] := '{}';
  v_row_id TEXT;
  v_lead_id UUID;
  k TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := COALESCE((v_new->>'id'), '');
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF (v_new->k) IS DISTINCT FROM (v_old->k) THEN
        v_changed := array_append(v_changed, k);
      END IF;
    END LOOP;
    IF array_length(v_changed, 1) IS NULL THEN
      RETURN NEW; -- nothing actually changed
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_row_id := COALESCE((v_old->>'id'), '');
  END IF;

  -- Best-effort lead_id resolution for cross-table filtering
  IF TG_TABLE_NAME = 'leads' THEN
    v_lead_id := NULLIF(v_row_id, '')::uuid;
  ELSE
    v_lead_id := NULLIF(COALESCE(v_new->>'lead_id', v_old->>'lead_id'), '')::uuid;
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  END IF;

  INSERT INTO public.sales_audit_log
    (actor_id, actor_email, action, table_name, row_id, changed_fields, old_data, new_data, lead_id)
  VALUES
    (v_actor, v_email, TG_OP, TG_TABLE_NAME, v_row_id, v_changed, v_old, v_new, v_lead_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to all sales tables we care about ------------------------
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'leads',
    'lead_notes',
    'lead_note_attachments',
    'lead_activities',
    'follow_ups',
    'sales_payments',
    'sales_targets',
    'sales_users',
    'sales_statuses',
    'sales_priorities',
    'sales_lead_sources',
    'sales_courses',
    'sales_payment_methods',
    'sales_expense_categories',
    'sales_message_templates',
    'sales_system_settings',
    'expenses'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_audit ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_sales_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.fn_sales_audit()', t
    );
  END LOOP;
END $$;
