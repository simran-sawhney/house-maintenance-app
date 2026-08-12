import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS. Server-only. Never import into client
 * code. Used exclusively for first-signup bootstrap (creating the household +
 * membership before the user has any rows RLS would let them read/write).
 *
 * Returns null when the service role key is not configured; callers should
 * fall back to a documented manual bootstrap in that case.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
