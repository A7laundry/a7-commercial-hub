"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus, ArrowRight } from "lucide-react"
import { formatCurrencyBR } from "@/lib/format"
import { UserAvatar } from "@/components/shared/UserAvatar"

// Static label/color maps — outside component
const STAGE_LABEL: Record<string, string> = {
  lead:       "Lead",
  em_contato: "Em contato",
  proposta:   "Proposta",
  sucesso:    "Sucesso",
  cliente:    "Cliente ativo",
  recorrente: "Recorrente",
}

const STAGE_COLOR: Record<string, string> = {
  lead:       "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  em_contato: "bg-blue-100 text-blue-700 ring-1 ring-blue-200",
  proposta:   "bg-purple-100 text-purple-700 ring-1 ring-purple-200",
  sucesso:    "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  cliente:    "bg-green-100 text-green-700 ring-1 ring-green-200",
  recorrente: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}min atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  return `${days}d atrás`
}

function useRecentAccounts(tenantId: string) {
  return useQuery({
    queryKey: ["dashboard:recent-accounts", tenantId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, pipeline_stage, estimated_value, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(10)
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: Boolean(tenantId),
    refetchInterval: 60_000,
  })
}

export function RecentAccountsCard({ tenantId }: { tenantId: string }) {
  const { data: accounts = [], isPending } = useRecentAccounts(tenantId)

  return (
    <div className="bg-white rounded-xl border border-transparent shadow-[0_2px_16px_rgba(2,36,72,0.07)] overflow-hidden h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8f9fa]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#022448]/8">
            <UserPlus className="w-3.5 h-3.5 text-[#022448]" />
          </div>
          <h3 className="text-sm font-extrabold font-headline text-[#022448]">
            Últimos clientes cadastrados
          </h3>
        </div>
        <Link
          href="/accounts"
          className="text-[10px] font-semibold text-muted-foreground hover:text-[#F5A623] flex items-center gap-1 transition-colors"
        >
          Ver todos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex-1">
        {isPending ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#022448]/8 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#022448]/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-[#022448] hover:text-[#F5A623] flex items-center gap-1 transition-colors"
            >
              Cadastrar primeiro cliente <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#022448]/6">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-[#f8f9fa] -mx-2 px-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <UserAvatar displayName={account.name} size={28} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#022448] truncate group-hover:text-[#F5A623] transition-colors">
                      {account.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5" suppressHydrationWarning>
                      {timeAgo(account.created_at)}
                      {account.estimated_value
                        ? ` · ${formatCurrencyBR(account.estimated_value)}`
                        : " · sem valor"}
                    </p>
                  </div>
                </div>
                {account.pipeline_stage && (
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    STAGE_COLOR[account.pipeline_stage] ?? "bg-slate-100 text-slate-600"
                  }`}>
                    {STAGE_LABEL[account.pipeline_stage] ?? account.pipeline_stage}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
