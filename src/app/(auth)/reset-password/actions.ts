"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type ResetState = { error: string | null }

export async function updatePasswordAction(
  _prev: ResetState,
  formData: FormData
): Promise<ResetState> {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm") as string

  if (password !== confirm) {
    return { error: "As senhas não coincidem." }
  }

  if (password.length < 6) {
    return { error: "A senha deve ter no mínimo 6 caracteres." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  redirect("/dashboard")
}
