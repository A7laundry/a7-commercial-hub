import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side code (API routes, cron jobs).
 * Never expose to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL")
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  })
}
