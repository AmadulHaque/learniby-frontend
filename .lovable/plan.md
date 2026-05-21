# Admin / Manager / Teacher Panel — Full Build

## Goal

Course portal-এ ৩টা control panel:
- **Admin** — সব কিছু (users, batches, courses, live links, audit)
- **Manager** — students/batches/course content/live link manage
- **Teacher** — শুধু assigned batch-এ live class link add

সব panel-এ একই purple StudentShell-look (sidebar + topbar), role অনুযায়ী menu items।

---

## 1. Database (one migration file)

`supabase/migrations/20260518_manager_role_class_sessions.sql`:

```sql
-- 1. add manager to enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'manager';

-- 2. batch ↔ teacher mapping (teacher একাধিক batch-এ thakte pare)
CREATE TABLE IF NOT EXISTS batch_teachers (
  batch_id uuid REFERENCES batches(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  PRIMARY KEY (batch_id, teacher_id)
);
ALTER TABLE batch_teachers ENABLE ROW LEVEL SECURITY;

-- 3. live class sessions
CREATE TABLE IF NOT EXISTS class_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_link text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_min int DEFAULT 60,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON class_sessions (batch_id, scheduled_at DESC);
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- 4. helpers
CREATE OR REPLACE FUNCTION is_teacher_of_batch(_uid uuid, _batch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM batch_teachers WHERE teacher_id=_uid AND batch_id=_batch);
$$;

-- 5. RLS — class_sessions
CREATE POLICY cs_admin_mgr_all ON class_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));

CREATE POLICY cs_teacher_own ON class_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'teacher') AND is_teacher_of_batch(auth.uid(),batch_id))
  WITH CHECK (has_role(auth.uid(),'teacher') AND is_teacher_of_batch(auth.uid(),batch_id));

CREATE POLICY cs_student_enrolled ON class_sessions FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id=auth.uid() AND e.batch_id=class_sessions.batch_id));

-- 6. RLS — batch_teachers
CREATE POLICY bt_admin_mgr ON batch_teachers FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'manager'));
CREATE POLICY bt_self_read ON batch_teachers FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());
```

User Supabase SQL Editor-এ একবার paste-run করবে।

---

## 2. Frontend

### Shared shell
- `src/components/course/PanelShell.tsx` — StudentShell-এর copy, props: `role`, `navItems`, role-specific brand badge ("Admin"/"Manager"/"Teacher")।

### Auth
- `src/contexts/AuthContext.tsx` — `Role` type-এ `"manager"` add, `loadRole`-এ priority: admin > manager > teacher > student।
- AuthTabs/route guards — `/dashboard/admin/*` ⇒ admin only, `/dashboard/manager/*` ⇒ admin+manager, `/dashboard/teacher/*` ⇒ admin+manager+teacher।

### Routes (scratch থেকে নতুন)

**Admin** (`/dashboard/admin/*`):
- `index.tsx` — stats (total students, teachers, managers, batches, upcoming classes)
- `users.tsx` — সব user list, role assign/revoke (admin/manager/teacher/student)
- `batches.tsx` — batch CRUD + teacher assign
- `courses.tsx` — course/module/video CRUD (existing logic reuse)
- `sessions.tsx` — সব class sessions (filter by batch)
- `audit.tsx` — audit log
- পুরনো `dashboard.admin.*.tsx` ফাইল delete

**Manager** (`/dashboard/manager/*`):
- `index.tsx` — stats (own scope)
- `students.tsx` — student add/edit/enroll in batch
- `batches.tsx` — batch CRUD
- `courses.tsx` — course content manage
- `sessions.tsx` — class link add/edit (any batch)

**Teacher** (`/dashboard/teacher/*`):
- `index.tsx` — assigned batches + upcoming sessions
- `sessions.tsx` — শুধু own batch-এ class link add ("ক্লাস শুরুতে link দিন")

### Student-side
- `dashboard.live-class.tsx` — class_sessions থেকে enrolled batch-এর upcoming + past sessions দেখাবে (placeholder data বাদ)।

### Route guards
প্রতিটা panel-এর parent route (`dashboard.admin.tsx`, `dashboard.manager.tsx`, `dashboard.teacher.tsx`)-এ `beforeLoad` দিয়ে role check + redirect।

---

## 3. Login routing
Login successful হলে role অনুযায়ী landing:
- admin → `/dashboard/admin`
- manager → `/dashboard/manager`
- teacher → `/dashboard/teacher`
- student → `/dashboard`

---

## 4. Deliverable order (single turn)
1. Migration SQL file লিখব
2. AuthContext update
3. PanelShell component
4. Admin routes (6 ফাইল)
5. Manager routes (5 ফাইল)
6. Teacher routes (3 ফাইল)
7. Student live-class wire-up
8. Login redirect logic
9. Old admin route ফাইল cleanup
10. User-এর জন্য final message-এ SQL run instruction

## Out of scope (পরের loop)
- Teacher account self-signup (admin/manager manual create করবে)
- Email notification on new class link
- Calendar/recurring routine UI
- WhatsApp/SMS broadcast
