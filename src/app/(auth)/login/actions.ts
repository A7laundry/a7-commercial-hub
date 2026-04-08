"use server"

import { redirect, RedirectType } from "next/navigation"
import { headers } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export type AuthState = { error: string | null; emailSent?: boolean }

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  redirect("/dashboard")
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const headersList = await headers()
  const origin = headersList.get("origin") ?? headersList.get("x-forwarded-host") ?? ""

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  })

  if (error) return { error: error.message }

  // Don't auto-login — user must verify email first
  return { error: null, emailSent: true }
}
