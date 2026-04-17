"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function deactivateMember(
  targetUserId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autenticado." }

  // Verify requester is owner
  const { data: requesterMembership } = await supabase
    .from("tenant_users")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .single()

  if (!requesterMembership || requesterMembership.role !== "owner") {
    return { error: "Apenas o proprietário pode desativar usuários." }
  }

  // Cannot deactivate self
  if (targetUserId === user.id) {
    return { error: "Você não pode desativar sua própria conta." }
  }

  // Verify target is not an owner
  const { data: targetMembership } = await supabase
    .from("tenant_users")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("tenant_id", requesterMembership.tenant_id)
    .single()

  if (!targetMembership) {
    return { error: "Usuário não encontrado nesta equipe." }
  }

  if (targetMembership.role === "owner") {
    return { error: "Não é possível desativar outro proprietário." }
  }

  const { error } = await supabase
    .from("tenant_users")
    .delete()
    .eq("user_id", targetUserId)
    .eq("tenant_id", requesterMembership.tenant_id)

  if (error) return { error: error.message }

  revalidatePath("/settings/team")
  return { error: null }
}
