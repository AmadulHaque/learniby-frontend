import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tqydqebwrfqazkoidxbh.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWRxZWJ3cmZxYXprb2lkeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTM2MDQsImV4cCI6MjA5MjQyOTYwNH0.hseWwWb8Bh1gG7RB6U0_WEi9A535zSUB2Qin-BsJ1_w";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const SUPABASE_PROJECT_URL = SUPABASE_URL;
