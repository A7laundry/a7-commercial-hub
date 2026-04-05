import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"

export type OnboardingStep = {
  id: string
  label: string
  done: boolean
  href: string
  cta: string
}

export type OnboardingState = {
  steps: OnboardingStep[]
  completedCount: number
  totalCount: number
  allDone: boolean
  isLoading: boolean
}

export function useOnboardingState(tenantId: string): OnboardingState {
  const supabase = createClient()

  const { data, isPending } = useQuery({
    queryKey: ["onboarding_state", tenantId],
    queryFn: async () => {
      const [accountsRes, dealsRes, messagesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("deals")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId),
        supabase
          .from("whatsapp_messages")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("direction", "outbound"),
      ])

      return {
        hasAccount:  (accountsRes.count ?? 0) > 0,
        hasDeal:     (dealsRes.count ?? 0) > 0,
        hasSentMsg:  (messagesRes.count ?? 0) > 0,
      }
    },
    staleTime: 30_000,
  })

  const steps: OnboardingStep[] = [
    {
      id: "first_client",
      label: "Cadastrar primeiro cliente",
      done: data?.hasAccount ?? false,
      href: "/accounts",
      cta: "Cadastrar cliente",
    },
    {
      id: "first_deal",
      label: "Criar primeira oportunidade",
      done: data?.hasDeal ?? false,
      href: "/deals",
      cta: "Criar oportunidade",
    },
    {
      id: "first_message",
      label: "Enviar primeira mensagem WhatsApp",
      done: data?.hasSentMsg ?? false,
      href: "/inbox",
      cta: "Abrir inbox",
    },
  ]

  const completedCount = steps.filter((s) => s.done).length

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    allDone: completedCount === steps.length,
    isLoading: isPending,
  }
}
