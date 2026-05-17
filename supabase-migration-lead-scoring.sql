-- Lead Scoring System
-- Auto-calculates 0-100 score from engagement, recency, response time, status, priority, completeness.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS score_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_leads_lead_score ON public.leads(lead_score DESC);

CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  l record;
  s_engagement int := 0;
  s_recency int := 0;
  s_response int := 0;
  s_status int := 0;
  s_priority int := 0;
  s_complete int := 0;
  total int := 0;
  is_won_status boolean := false;
  c_call_conn int := 0;
  c_wa int := 0;
  c_call_att int := 0;
  c_notes int := 0;
  first_act timestamptz;
  last_act timestamptz;
  hours_since numeric;
  hours_to_first numeric;
BEGIN
  SELECT * INTO l FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- engagement (0-30)
  SELECT
    COUNT(*) FILTER (WHERE type = 'call_connected'),
    COUNT(*) FILTER (WHERE type = 'whatsapp_sent'),
    COUNT(*) FILTER (WHERE type = 'call_attempt'),
    COUNT(*) FILTER (WHERE type IN ('note_added','email_sent')),
    MIN(created_at) FILTER (WHERE type IN ('call_attempt','call_connected','whatsapp_sent','email_sent','note_added')),
    MAX(created_at)
  INTO c_call_conn, c_wa, c_call_att, c_notes, first_act, last_act
  FROM public.lead_activities WHERE lead_id = p_lead_id;

  s_engagement := LEAST(15, c_call_conn * 5)
                + LEAST(9, c_wa * 3)
                + LEAST(3, c_call_att * 1)
                + LEAST(3, c_notes * 1);

  -- recency (0-20) based on last activity (or last_activity_at fallback)
  last_act := COALESCE(last_act, l.last_activity_at, l.created_at);
  hours_since := EXTRACT(EPOCH FROM (now() - last_act)) / 3600.0;
  s_recency := CASE
    WHEN hours_since < 24 THEN 20
    WHEN hours_since < 72 THEN 15
    WHEN hours_since < 168 THEN 10
    WHEN hours_since < 336 THEN 5
    ELSE 0 END;

  -- response time (0-15): time from created → first activity
  IF first_act IS NOT NULL THEN
    hours_to_first := EXTRACT(EPOCH FROM (first_act - l.created_at)) / 3600.0;
    s_response := CASE
      WHEN hours_to_first < 1 THEN 15
      WHEN hours_to_first < 4 THEN 12
      WHEN hours_to_first < 24 THEN 8
      WHEN hours_to_first < 72 THEN 4
      ELSE 0 END;
  ELSE
    s_response := 0;
  END IF;

  -- status (0-20)
  SELECT COALESCE(is_won, false) INTO is_won_status FROM public.sales_statuses WHERE key = l.status;
  s_status := CASE
    WHEN is_won_status THEN 20
    WHEN l.status IN ('ready_for_class') THEN 15
    WHEN l.status IN ('follow_up') THEN 10
    WHEN l.status IN ('intake') THEN 5
    WHEN l.status IN ('no_response','disqualified','lost') THEN 0
    ELSE 7
  END;

  -- priority (0-10)
  s_priority := CASE l.priority
    WHEN 'urgent' THEN 10
    WHEN 'high'   THEN 7
    WHEN 'medium' THEN 4
    WHEN 'low'    THEN 2
    ELSE 0 END;

  -- profile completeness (0-5)
  s_complete :=
      (CASE WHEN l.email IS NOT NULL AND l.email <> '' THEN 1 ELSE 0 END)
    + (CASE WHEN l.whatsapp IS NOT NULL AND l.whatsapp <> '' THEN 1 ELSE 0 END)
    + (CASE WHEN l.city IS NOT NULL AND l.city <> '' THEN 1 ELSE 0 END)
    + (CASE WHEN l.budget_range IS NOT NULL AND l.budget_range <> 'not_disclosed' THEN 1 ELSE 0 END)
    + (CASE WHEN l.child_age IS NOT NULL THEN 1 ELSE 0 END);

  total := LEAST(100, s_engagement + s_recency + s_response + s_status + s_priority + s_complete);

  UPDATE public.leads SET
    lead_score = total,
    score_breakdown = jsonb_build_object(
      'engagement', s_engagement,
      'recency', s_recency,
      'response_time', s_response,
      'status', s_status,
      'priority', s_priority,
      'completeness', s_complete,
      'total', total
    ),
    score_updated_at = now()
  WHERE id = p_lead_id;
END $$;

-- Recompute on activity insert
CREATE OR REPLACE FUNCTION public.trg_recalc_lead_score_from_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.calculate_lead_score(NEW.lead_id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recalc_score_on_activity ON public.lead_activities;
CREATE TRIGGER trg_recalc_score_on_activity
AFTER INSERT ON public.lead_activities
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_lead_score_from_activity();

-- Recompute on lead status/priority/profile changes
CREATE OR REPLACE FUNCTION public.trg_recalc_lead_score_from_lead()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.calculate_lead_score(NEW.id);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_recalc_score_on_lead_change ON public.leads;
CREATE TRIGGER trg_recalc_score_on_lead_change
AFTER UPDATE OF status, priority, email, whatsapp, city, budget_range, child_age ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_lead_score_from_lead();

-- Cron: nightly recompute all (recency decays over time)
DO $$ BEGIN PERFORM cron.unschedule('lead_score_nightly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('lead_score_nightly', '0 2 * * *', $$
  SELECT public.calculate_lead_score(id) FROM public.leads
$$);

-- One-time backfill
SELECT public.calculate_lead_score(id) FROM public.leads;
