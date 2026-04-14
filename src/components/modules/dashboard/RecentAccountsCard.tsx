"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus, ArrowRight } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

const STAGE_LABEL: Record<string, string> = {
  lead:        "Lead",
  in_service:  "Em serviço",
  em_contato:  "Em contato",
  quote_sent:  "Proposta",
  proposta:    "Proposta",
  negotiating: "Negociando",
  sucesso:     "Sucesso",
  closed:      "Fechado",
  cliente:     "Cliente",
  recurring:   "Recorrente",
  recorrente:  "Recorrente",
}

const STAGE_COLOR: Record<string, string> = {
  lead:        "bg-slate-100 text-slate-600",
  in_service:  "bg-blue-100 text-blue-700",
  em_contato:  "bg-blue-100 text-blue-700",
  quote_sent:  "bg-purple-100 text-purple-700",
  proposta:    "bg-purple-100 text-purple-700",
  negotiating: "bg-amber-100 text-amber-700",
  sucesso:     "bg-emerald-100 text-emerald-700",
  closed:      "bg-green-100 text-green-700",
  cliente:     "bg-green-100 text-green-700",
  recurring:   "bg-emerald-100 text-emerald-700",
  recorrente:  "bg-emerald-100 text-emerald-700",
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
    <Card className="shadow-[0_24px_40px_rgba(25,28,29,0.03)] border-transparent h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#022448]" />
            <CardTitle
              className="text-sm font-extrabold text-[#022448]"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Últimos clientes cadastrados
            </CardTitle>
          </div>
          <Link
            href="/accounts"
            className="text-[10px] font-semibold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isPending ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-36" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2 text-muted-foreground">
            <UserPlus className="w-8 h-8 opacity-20" />
            <p className="text-sm">Nenhum cliente cadastrado ainda.</p>
            <Link
              href="/accounts"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              Cadastrar primeiro cliente <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                    {account.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {timeAgo(account.created_at)}
                    {account.estimated_value
                      ? ` · ${formatCurrency(account.estimated_value, "BRL")}`
                      : " · sem valor definido"}
                  </p>
                </div>
                {account.pipeline_stage && (
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      STAGE_COLOR[account.pipeline_stage] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STAGE_LABEL[account.pipeline_stage] ?? account.pipeline_stage}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
