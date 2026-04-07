"use server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

export type UpdateUserProfileData = {
  display_name: string
  job_title: string
  phone: string
  bio: string
  avatar_url?: string
}

export async function updateUserProfile(
  userId: string,
  data: UpdateUserProfileData
): Promise<{ error: string | null }> {
  // Validate bio length
  if (data.bio && data.bio.length > 160) {
    return { error: "Bio deve ter no máximo 160 caracteres" }
  }

  // Verify the caller is the authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Não autenticado" }
  if (user.id !== userId) return { error: "Acesso negado" }

  const service = createServiceClient()

  const upsertData: Record<string, unknown> = {
    user_id: userId,
    display_name: data.display_name.trim() || null,
    job_title: data.job_title.trim() || null,
    phone: data.phone.trim() || null,
    bio: data.bio.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (data.avatar_url !== undefined) {
    upsertData.avatar_url = data.avatar_url || null
  }

  const { error } = await service
    .from("user_profiles")
    .upsert(upsertData, { onConflict: "user_id" })

  if (error) return { error: "Erro ao salvar perfil: " + error.message }
  return { error: null }
}
