"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (!data) throw new Error("No tenant found")
  return data.tenant_id as string
}

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase.from("accounts").insert({
    tenant_id: tenantId,
    name: formData.get("name") as string,
    segment: (formData.get("segment") as string) || null,
    contact_name: (formData.get("contact_name") as string) || null,
    contact_email: (formData.get("contact_email") as string) || null,
    status: (formData.get("status") as string) || "active",
    notes: (formData.get("notes") as string) || null,
  })

  if (error) return { error: error.message }
  revalidatePath("/accounts")
  return { error: null }
}

export async function updateAccount(id: string, formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("accounts")
    .update({
      name: formData.get("name") as string,
      segment: (formData.get("segment") as string) || null,
      contact_name: (formData.get("contact_name") as string) || null,
      contact_email: (formData.get("contact_email") as string) || null,
      status: formData.get("status") as string,
      notes: (formData.get("notes") as string) || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath(`/accounts/${id}`)
  revalidatePath("/accounts")
  return { error: null }
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/accounts")
  return { error: null }
}
