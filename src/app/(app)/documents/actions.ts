"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single()

  if (!data) throw new Error("No tenant found")
  return { tenantId: data.tenant_id as string, userId: user.id }
}

export async function createDocumentRecord(formData: FormData) {
  const supabase = await createClient()
  const { tenantId, userId } = await getTenantId(supabase)

  const expiresAt = formData.get("expires_at") as string
  const { error } = await supabase.from("documents").insert({
    tenant_id: tenantId,
    account_id: (formData.get("account_id") as string) || null,
    contract_id: (formData.get("contract_id") as string) || null,
    name: formData.get("name") as string,
    doc_type: formData.get("doc_type") as string,
    storage_path: formData.get("storage_path") as string,
    mime_type: (formData.get("mime_type") as string) || null,
    size_bytes: formData.get("size_bytes") ? Number(formData.get("size_bytes")) : null,
    expires_at: expiresAt || null,
    uploaded_by: userId,
  })

  if (error) return { error: error.message }
  revalidatePath("/documents")
  return { error: null }
}

export async function updateDocument(
  id: string,
  data: { name?: string; doc_type?: string; expires_at?: string | null }
) {
  const supabase = await createClient()
  const { tenantId } = await getTenantId(supabase)

  const { error } = await supabase
    .from("documents")
    .update(data)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/documents")
  return { error: null }
}

export async function deleteDocument(id: string, storagePath: string) {
  const supabase = await createClient()
  const { tenantId } = await getTenantId(supabase)

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("documents")
    .remove([storagePath])

  if (storageError) return { error: storageError.message }

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/documents")
  return { error: null }
}
