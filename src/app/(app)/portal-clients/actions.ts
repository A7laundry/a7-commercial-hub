"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (!data) throw new Error("No tenant found")
  return { supabase, tenantId: data.tenant_id as string }
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function invitePortalClient(formData: FormData) {
  const { supabase, tenantId } = await getContext()

  const email      = (formData.get("email") as string).trim().toLowerCase()
  const name       = (formData.get("name") as string).trim()
  const account_id = formData.get("account_id") as string

  if (!email || !account_id) return { error: "Email e conta são obrigatórios." }

  // Verify account belongs to tenant
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", account_id)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (!account) return { error: "Conta não encontrada." }

  // Create or update portal_clients record
  const { error: upsertError } = await supabase
    .from("portal_clients")
    .upsert(
      { tenant_id: tenantId, account_id, email, name: name || null, active: true },
      { onConflict: "tenant_id,email" }
    )

  if (upsertError) return { error: upsertError.message }

  // Send invite email via Supabase Auth admin API
  const admin = adminClient()
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard`,
    data: { name },
  })

  // inviteUserByEmail fails if user already exists — fall back to magic link
  if (inviteError) {
    const { error: otpError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard` },
    })
    if (otpError) return { error: `Convite criado, mas falha ao enviar email: ${otpError.message}` }
  }

  revalidatePath("/portal-clients")
  return { error: null }
}

export async function resendPortalInvite(email: string) {
  const admin = adminClient()
  const { error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal/dashboard` },
  })
  if (error) return { error: error.message }
  return { error: null }
}

export async function setPortalClientActive(id: string, active: boolean) {
  const { supabase, tenantId } = await getContext()

  const { error } = await supabase
    .from("portal_clients")
    .update({ active })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/portal-clients")
  return { error: null }
}

export async function deletePortalClient(id: string) {
  const { supabase, tenantId } = await getContext()

  const { error } = await supabase
    .from("portal_clients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/portal-clients")
  return { error: null }
}
