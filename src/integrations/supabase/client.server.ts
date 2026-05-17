import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tqydqebwrfqazkoidxbh.supabase.co";

// Service role key — backend only, NEVER import this in client code.
// Stored as LEARNIBY_SERVICE_ROLE_KEY secret (SUPABASE_ prefix is reserved by platform).
const SERVICE_ROLE_KEY = process.env.LEARNIBY_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "LEARNIBY_SERVICE_ROLE_KEY is not set. Add it as a project secret."
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
