"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { deriveContractStatus } from "@/lib/utils"

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

export async function createContract(formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const starts_at = formData.get("starts_at") as string
  const ends_at = formData.get("ends_at") as string
  const status = deriveContractStatus(starts_at, ends_at)

  const { error } = await supabase.from("contracts").insert({
    tenant_id: tenantId,
    account_id: formData.get("account_id") as string,
    title: formData.get("title") as string,
    currency: (formData.get("currency") as string) || "BRL",
    total_value: parseFloat((formData.get("total_value") as string) || "0"),
    starts_at,
    ends_at,
    auto_renew: formData.get("auto_renew") === "true",
    notes: (formData.get("notes") as string) || null,
    status,
  })

  if (error) return { error: error.message }
  revalidatePath("/contracts")
  return { error: null }
}

export async function updateContract(id: string, formData: FormData) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const starts_at = formData.get("starts_at") as string
  const ends_at = formData.get("ends_at") as string
  const status = deriveContractStatus(starts_at, ends_at)

  const { error } = await supabase
    .from("contracts")
    .update({
      account_id: formData.get("account_id") as string,
      title: formData.get("title") as string,
      currency: (formData.get("currency") as string) || "BRL",
      total_value: parseFloat((formData.get("total_value") as string) || "0"),
      starts_at,
      ends_at,
      auto_renew: formData.get("auto_renew") === "true",
      notes: (formData.get("notes") as string) || null,
      status,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath(`/contracts/${id}`)
  revalidatePath("/contracts")
  return { error: null }
}

export async function deleteContract(id: string) {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/contracts")
  return { error: null }
}
