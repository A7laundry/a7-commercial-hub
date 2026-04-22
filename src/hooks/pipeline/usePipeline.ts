import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import type { Account, PipelineStage } from "@/types"

export type OperatorRef = {
  name: string
  avatarUrl: string | null
  initials: string
}

export const PIPELINE_STAGES: PipelineStage[] = [
  "lead",
  "em_contato",
  "proposta",
  "sucesso",
  "cliente",
  "recorrente",
]

export const STAGE_CONFIG: Record<
  PipelineStage,
  { label: string; color: string; headerBg: string; dot: string }
> = {
  lead:       { label: "Lead",          color: "border-slate-200",  headerBg: "bg-slate-50",   dot: "bg-slate-400" },
  em_contato: { label: "Em contato",    color: "border-blue-200",   headerBg: "bg-blue-50",    dot: "bg-blue-500" },
  proposta:   { label: "Proposta",      color: "border-purple-200", headerBg: "bg-purple-50",  dot: "bg-purple-500" },
  sucesso:    { label: "Sucesso",       color: "border-amber-200",  headerBg: "bg-amber-50",   dot: "bg-amber-500" },
  cliente:    { label: "Cliente ativo", color: "border-green-200",  headerBg: "bg-green-50",   dot: "bg-green-500" },
  recorrente: { label: "Recorrente",    color: "border-emerald-200",headerBg: "bg-emerald-50", dot: "bg-emerald-500" },
}

export type PipelineBoard = Record<PipelineStage, Account[]>
export type OperatorByAccount = Map<string, OperatorRef>

export type PipelineStats = {
  totalAccounts: number
  totalEstimatedValue: number  // todos os estágios (para referência)
  closedValue: number          // apenas sucesso + cliente + recorrente (vendas fechadas)
  byStage: Record<PipelineStage, { count: number; value: number }>
}

export function usePipeline(tenantId: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ["pipeline", tenantId],
    queryFn: async () => {
      const [accountsRes, timelineRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("in_pipeline", true)
          .order("created_at", { ascending: false })
          .limit(10000),

        // Latest timeline event per account — used to identify which operator
        // last touched each client. Ordered desc so first occurrence = most recent.
        supabase
          .from("account_timeline")
          .select("account_id, created_by, created_at")
          .eq("tenant_id", tenantId)
          .not("created_by", "is", null)
          .order("created_at", { ascending: false })
          .limit(2000),
      ])

      if (accountsRes.error) throw accountsRes.error

      const accounts = (accountsRes.data ?? []) as Account[]

      // ── Build operator attribution map ─────────────────────────────────────
      // Keep only first occurrence per account (= most recent event)
      const latestActorByAccount = new Map<string, string>() // account_id → user_id
      for (const evt of (timelineRes.data ?? [])) {
        if (!latestActorByAccount.has(evt.account_id) && evt.created_by) {
          latestActorByAccount.set(evt.account_id, evt.created_by)
        }
      }

      const operatorByAccount: OperatorByAccount = new Map()

      if (latestActorByAccount.size > 0) {
        const userIds = [...new Set(latestActorByAccount.values())]
        const { data: profiles } = await supabase
          .from("user_profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds)

        const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()
        for (const p of (profiles ?? [])) {
          profileMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url })
        }

        for (const [accountId, userId] of latestActorByAccount) {
          const profile = profileMap.get(userId)
          const name = profile?.display_name ?? "?"
          const initials = name
            .split(" ")
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("")
          operatorByAccount.set(accountId, {
            name,
            avatarUrl: profile?.avatar_url ?? null,
            initials,
          })
        }
      }

      // ── Board + stats ──────────────────────────────────────────────────────
      const board = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage] = accounts.filter((a) => a.pipeline_stage === stage)
        return acc
      }, {} as PipelineBoard)

      const CLOSED_STAGES: PipelineStage[] = ["sucesso", "cliente", "recorrente"]
      const stats: PipelineStats = {
        totalAccounts: accounts.length,
        totalEstimatedValue: accounts.reduce((s, a) => s + (a.estimated_value ?? 0), 0),
        closedValue: accounts
          .filter((a) => CLOSED_STAGES.includes(a.pipeline_stage as PipelineStage))
          .reduce((s, a) => s + (a.estimated_value ?? 0), 0),
        byStage: PIPELINE_STAGES.reduce((acc, stage) => {
          const stageAccounts = board[stage]
          acc[stage] = {
            count: stageAccounts.length,
            value: stageAccounts.reduce((s, a) => s + (a.estimated_value ?? 0), 0),
          }
          return acc
        }, {} as PipelineStats["byStage"]),
      }

      return { board, stats, operatorByAccount }
    },
    staleTime: 30_000,
  })
}
