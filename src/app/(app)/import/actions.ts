"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { ImportRow } from "@/lib/import/normalizer"

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
  return data.tenant_id as string
}

export type BatchImportResult = {
  imported: number
  skipped: number
  errors: string[]
}

export async function batchImportAccounts(
  rows: ImportRow[],
  options: { skipDuplicates: boolean }
): Promise<BatchImportResult> {
  const supabase = await createClient()
  const tenantId = await getTenantId(supabase)

  const toInsert = options.skipDuplicates ? rows.filter((r) => !r._duplicate) : rows

  if (toInsert.length === 0) {
    return { imported: 0, skipped: rows.length, errors: [] }
  }

  // Check for existing accounts by name to avoid re-importing
  const names = toInsert.map((r) => r.name)
  const { data: existing } = await supabase
    .from("accounts")
    .select("name")
    .eq("tenant_id", tenantId)
    .in("name", names)

  const existingNames = new Set((existing ?? []).map((e) => e.name.toLowerCase()))

  const newRows = toInsert.filter((r) => !existingNames.has(r.name.toLowerCase()))
  const alreadyExist = toInsert.length - newRows.length

  if (newRows.length === 0) {
    return { imported: 0, skipped: rows.length, errors: [] }
  }

  const inserts = newRows.map((r) => ({
    tenant_id: tenantId,
    name: r.name,
    segment: r.segment,
    contact_name: r.contact_name,
    contact_email: r.contact_email,
    status: r.status,
    notes: r.notes,
    pipeline_stage: r.pipeline_stage,
    commercial_status: r.commercial_status,
    estimated_value: r.estimated_value,
    frequency: r.frequency,
    last_contact_at: r.last_contact_at,
  }))

  // Insert in chunks of 100 to avoid payload limits
  const CHUNK = 100
  const errors: string[] = []
  let imported = 0
  const insertedAccounts: { id: string; name: string }[] = []

  for (let i = 0; i < inserts.length; i += CHUNK) {
    const chunk = inserts.slice(i, i + CHUNK)
    const { error, data } = await supabase
      .from("accounts")
      .insert(chunk)
      .select("id, name")

    if (error) {
      errors.push(`Chunk ${Math.floor(i / CHUNK) + 1}: ${error.message}`)
    } else {
      imported += data?.length ?? chunk.length
      if (data) insertedAccounts.push(...data)
    }
  }

  // Save phone_mappings for accounts that have a phone
  if (insertedAccounts.length > 0) {
    const nameToId = new Map(insertedAccounts.map((a) => [a.name.toLowerCase(), a.id]))
    const phoneMappings = newRows
      .filter((r) => r.phone)
      .map((r) => {
        const accountId = nameToId.get(r.name.toLowerCase())
        if (!accountId) return null
        return { tenant_id: tenantId, account_id: accountId, phone: r.phone! }
      })
      .filter(Boolean) as { tenant_id: string; account_id: string; phone: string }[]

    if (phoneMappings.length > 0) {
      // Deduplicate by phone before inserting
      const seen = new Set<string>()
      const unique = phoneMappings.filter((p) => {
        if (seen.has(p.phone)) return false
        seen.add(p.phone)
        return true
      })
      for (let i = 0; i < unique.length; i += CHUNK) {
        await supabase
          .from("phone_mappings")
          .upsert(unique.slice(i, i + CHUNK), { onConflict: "tenant_id,phone", ignoreDuplicates: true })
      }
    }
  }

  revalidatePath("/accounts")
  revalidatePath("/pipeline")

  return {
    imported,
    skipped: rows.length - newRows.length + alreadyExist,
    errors,
  }
}
