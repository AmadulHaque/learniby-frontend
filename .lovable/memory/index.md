# Project Memory

## Core
Project: Learniby — দুটি panel এক app-এ।
- /course/* → Course Portal (students/teachers/admins) — Deep Purple #6B2FB8 theme
- /sales/* → Sales LMS (sales reps/admins) — Deep Blue #1E40AF theme (.sales-theme scope)
- / → public landing (placeholder, পরে WordPress replace হবে)

Backend: Manual Supabase (NOT Lovable Cloud). Project ref: tqydqebwrfqazkoidxbh. URL: https://tqydqebwrfqazkoidxbh.supabase.co
Anon key (public, in src/integrations/supabase/client.ts).
Service_role key: stored as LEARNIBY_SERVICE_ROLE_KEY secret.
DB password: 9Nrffb5W-dgAvuy. Direct connect: postgresql://postgres:9Nrffb5W-dgAvuy@db.tqydqebwrfqazkoidxbh.supabase.co:5432/postgres?sslmode=require
ALWAYS run SQL migrations myself via psql. NEVER ask user to run SQL.

Course schema applied: profiles, user_roles, batches, courses, modules, videos, enrollments, video_access + RLS + has_role + has_course_access + IP-lock.
Course master admin: admin@learniby.com / Admin@123456 (id: 9ea792e3-5607-4879-85c8-3a1f942cfb02).

Sales schema applied: sales_users (id→auth.users, email, full_name, role enum admin|executive, is_active, phone) + RLS + is_sales_admin() + is_sales_user() helper functions.
Sales first admin: sales-admin@learniby.com / SalesAdmin@123 (id: 211e95da-2942-4d3e-b050-7ef02901aa76, role=admin).
Auth strategy: shared Supabase auth.users; sales_users table membership gates /sales access. SalesAuthContext rejects non-sales users at /sales/login.

User: SSH-only server, no Coolify dashboard. Bengali+English mix UI. Mobile-first premium.

## Memories
(none yet)
