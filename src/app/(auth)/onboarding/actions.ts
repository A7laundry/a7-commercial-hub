"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type State = { error: string | null }

export async function createTenantAction(
  _prev: State,
  formData: FormData
): Promise<State> {
  const name = formData.get("name") as string
  const slug = formData.get("slug") as string

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado." }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({ name, slug })
    .select()
    .single()

  if (tenantError) {
    if (tenantError.code === "23505") return { error: "Esse slug já está em uso." }
    return { error: tenantError.message }
  }

  const { error: memberError } = await supabase
    .from("tenant_users")
    .insert({ tenant_id: tenant.id, user_id: user.id, role: "owner" })

  if (memberError) return { error: memberError.message }

  redirect("/dashboard")
}
