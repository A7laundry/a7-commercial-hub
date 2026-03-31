"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

type State = { error: string | null; message?: string }

export async function portalLoginAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: "Email ou senha inválidos." }

  const { data: portalClient } = await supabase
    .from("portal_clients")
    .select("id, active")
    .eq("email", email)
    .maybeSingle()

  if (!portalClient || !portalClient.active) {
    await supabase.auth.signOut()
    return { error: "Acesso não autorizado ao portal. Contate sua empresa prestadora." }
  }

  redirect("/portal/dashboard")
}

export async function portalMagicLinkAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const email = formData.get("email") as string

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: portalClient } = await admin
    .from("portal_clients")
    .select("id, active")
    .eq("email", email)
    .maybeSingle()

  if (!portalClient || !portalClient.active) {
    return {
      error: null,
      message: "Se este email estiver cadastrado, você receberá um link de acesso em instantes.",
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard`,
    },
  })

  if (error) return { error: "Não foi possível enviar o link. Tente novamente." }

  return {
    error: null,
    message: "Link de acesso enviado! Verifique seu email.",
  }
}

export async function portalSignOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/portal/login")
}
