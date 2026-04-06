"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { createClient } from "@/lib/supabase/server"

export async function updateOrganizationName(
  tenantId: string,
  name: string
): Promise<{ error: string | null }> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length < 2) {
    return { error: "Nome deve ter pelo menos 2 caracteres" }
  }

  // Verify the caller belongs to this tenant
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado" }

  const { data: membership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .single()

  if (!membership) return { error: "Acesso negado" }
  if (!["owner", "admin"].includes(membership.role)) {
    return { error: "Apenas proprietários e administradores podem editar a organização" }
  }

  const service = createServiceClient()
  const { error } = await service
    .from("tenants")
    .update({ name: trimmed })
    .eq("id", tenantId)

  if (error) return { error: "Erro ao salvar: " + error.message }
  return { error: null }
}
