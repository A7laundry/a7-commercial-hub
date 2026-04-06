"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

async function assertAdmin(): Promise<void> {
  const adminEmails = getAdminEmails()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !adminEmails.includes(user.email.toLowerCase())) {
    throw new Error("Acesso negado")
  }
}

export async function adminUpdateUserRole(
  userId: string,
  tenantId: string,
  role: string
): Promise<{ error: string | null }> {
  try {
    await assertAdmin()
  } catch {
    return { error: "Acesso negado" }
  }

  const validRoles = ["owner", "admin", "member", "viewer"]
  if (!validRoles.includes(role)) return { error: "Role inválido" }

  const service = createServiceClient()
  const { error } = await service
    .from("tenant_users")
    .update({ role })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function adminUpdateOrgName(
  tenantId: string,
  name: string
): Promise<{ error: string | null }> {
  try {
    await assertAdmin()
  } catch {
    return { error: "Acesso negado" }
  }

  const trimmed = name.trim()
  if (trimmed.length < 2) return { error: "Nome muito curto" }

  const service = createServiceClient()
  const { error } = await service
    .from("tenants")
    .update({ name: trimmed })
    .eq("id", tenantId)

  if (error) return { error: error.message }
  return { error: null }
}
