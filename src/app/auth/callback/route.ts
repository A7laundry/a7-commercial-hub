import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { EmailOtpType } from "@supabase/supabase-js"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type       = searchParams.get("type") as EmailOtpType | null
  const next       = searchParams.get("next") ?? "/dashboard"

  const supabase = await createClient()

  // ── PKCE flow — OAuth / magic link / signup confirmation ─────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // ── Token hash flow — password recovery email ─────────────────────────────
  // Supabase sends token_hash+type when PKCE is not used or when the email
  // template uses {{ .TokenHash }} directly (most common in recovery emails).
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) {
      // Recovery always goes to the reset-password form, never to /dashboard
      const dest = type === "recovery" ? "/reset-password" : next
      return NextResponse.redirect(`${origin}${dest}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
