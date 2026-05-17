-- Notifications: triggers + scheduled jobs for all notification kinds
-- Kinds: lead_assigned, status_changed, follow_up_reminder, overdue_follow_up, leads_imported, system

-- =============================================================
-- 1. lead_assigned: trigger when assigned_to is set or changes
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_lead_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  actor_name text;
BEGIN
  IF NEW.assigned_to IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
    RETURN NEW;
  END IF;
  -- skip self-assign noise
  IF NEW.assigned_to = COALESCE(NEW.created_by, auth.uid()) AND TG_OP = 'INSERT' THEN
    -- still notify so executive sees it on dashboard
    NULL;
  END IF;
  INSERT INTO public.notifications (user_id, kind, title, body, action_url)
  VALUES (
    NEW.assigned_to,
    'lead_assigned',
    'New lead assigned: ' || NEW.full_name,
    COALESCE(NEW.phone, '') || CASE WHEN NEW.city IS NOT NULL THEN ' • ' || NEW.city ELSE '' END,
    '/sales/leads/' || NEW.id::text
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lead_assigned ON public.leads;
CREATE TRIGGER trg_notify_lead_assigned
AFTER INSERT OR UPDATE OF assigned_to ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_lead_assigned();

-- =============================================================
-- 2. status_changed: trigger on status change
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_status_changed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  status_label text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  SELECT label INTO status_label FROM public.sales_statuses WHERE key = NEW.status LIMIT 1;
  status_label := COALESCE(status_label, NEW.status);

  -- Notify assignee (skip if they made the change)
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, kind, title, body, action_url)
    VALUES (
      NEW.assigned_to,
      'status_changed',
      NEW.full_name || ' → ' || status_label,
      'Lead status updated to ' || status_label,
      '/sales/leads/' || NEW.id::text
    );
  END IF;

  -- Notify all admins (except actor)
  INSERT INTO public.notifications (user_id, kind, title, body, action_url)
  SELECT su.id, 'status_changed',
         NEW.full_name || ' → ' || status_label,
         'Lead status updated to ' || status_label,
         '/sales/leads/' || NEW.id::text
  FROM public.sales_users su
  WHERE su.role = 'admin'
    AND su.id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    AND su.id IS DISTINCT FROM NEW.assigned_to;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_status_changed ON public.leads;
CREATE TRIGGER trg_notify_status_changed
AFTER UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.notify_status_changed();

-- =============================================================
-- 3. follow_up_reminder: scheduled scan
-- Notifies assignee when follow_up_date is within next 15 minutes (or custom reminder window)
-- Dedupe: no duplicate within last 60 min for same lead
-- =============================================================
CREATE OR REPLACE FUNCTION public.scan_follow_up_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, action_url)
  SELECT
    l.assigned_to,
    'follow_up_reminder',
    'Follow-up due: ' || l.full_name,
    'Scheduled at ' || to_char(l.follow_up_date AT TIME ZONE 'Asia/Dhaka', 'HH24:MI on DD Mon'),
    '/sales/leads/' || l.id::text
  FROM public.leads l
  WHERE l.assigned_to IS NOT NULL
    AND l.follow_up_date IS NOT NULL
    AND l.follow_up_date > now()
    AND l.follow_up_date <= now() + (COALESCE(l.follow_up_reminder_minutes, 15) || ' minutes')::interval
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = l.assigned_to
        AND n.kind = 'follow_up_reminder'
        AND n.action_url = '/sales/leads/' || l.id::text
        AND n.created_at > now() - interval '60 minutes'
    );
END $$;

-- =============================================================
-- 4. overdue_follow_up: scheduled scan
-- Notifies assignee + admins when follow_up_date < now and status not won
-- Dedupe: no duplicate within last 24h for same lead
-- =============================================================
CREATE OR REPLACE FUNCTION public.scan_overdue_follow_ups()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, action_url)
  SELECT
    l.assigned_to,
    'overdue_follow_up',
    'Overdue: ' || l.full_name,
    'Follow-up was due ' || to_char(l.follow_up_date AT TIME ZONE 'Asia/Dhaka', 'DD Mon HH24:MI'),
    '/sales/leads/' || l.id::text
  FROM public.leads l
  LEFT JOIN public.sales_statuses s ON s.key = l.status
  WHERE l.assigned_to IS NOT NULL
    AND l.follow_up_date IS NOT NULL
    AND l.follow_up_date < now()
    AND COALESCE(s.is_won, false) = false
    AND l.status <> 'lost'
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.user_id = l.assigned_to
        AND n.kind = 'overdue_follow_up'
        AND n.action_url = '/sales/leads/' || l.id::text
        AND n.created_at > now() - interval '24 hours'
    );
END $$;

-- =============================================================
-- 5. leads_imported: helper function (callable from app after bulk import)
-- =============================================================
CREATE OR REPLACE FUNCTION public.notify_leads_imported(p_user_id uuid, p_count int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, kind, title, body, action_url)
  VALUES (
    p_user_id,
    'leads_imported',
    p_count || ' leads imported',
    'Your bulk import finished successfully.',
    '/sales/leads'
  );
$$;

-- =============================================================
-- 6. Schedule cron jobs (every 5 min)
-- =============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('notif_followup_reminder');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$
BEGIN
  PERFORM cron.unschedule('notif_overdue_followup');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule('notif_followup_reminder', '*/5 * * * *', $$SELECT public.scan_follow_up_reminders();$$);
SELECT cron.schedule('notif_overdue_followup', '*/15 * * * *', $$SELECT public.scan_overdue_follow_ups();$$);
