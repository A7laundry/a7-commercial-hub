"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Pencil, Trash2, BarChart2,
  Flame, Thermometer, Snowflake, AlertTriangle, TrendingUp,
  DollarSign, Clock, Zap, AlertCircle, ArrowRight,
  Building2, Mail, User, Tag, AlignLeft, Calendar, Target,
  RefreshCw,
} from "lucide-react"
import { useTenant } from "@/hooks/useTenant"
import { useAccount } from "@/hooks/accounts/useAccount"
import { useContracts } from "@/hooks/contracts/useContracts"
import { useQueryClient } from "@tanstack/react-query"
import { updateAccount, deleteAccount } from "../actions"
import { AccountForm } from "@/components/modules/accounts/AccountForm"
import { ContractsTable } from "@/components/modules/contracts/ContractsTable"
import { DocumentsList } from "@/components/modules/documents/DocumentsList"
import { OpportunityPanel } from "@/components/modules/accounts/OpportunityPanel"
import { useAccountDeals } from "@/hooks/deals/useAccountDeals"
import { WhatsAppTimeline } from "@/components/modules/accounts/WhatsAppTimeline"
import { QuickActions } from "@/components/modules/accounts/QuickActions"
import { AccountTimeline } from "@/components/modules/accounts/AccountTimeline"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatDateBR } from "@/lib/format"
import {
  computeCommercialScore,
  computeNextBestAction,
  computeLTV,
  parseFrequencyPerMonth,
  SCORE_CONFIG,
} from "@/lib/commercial-intelligence"

const SCORE_ICON = {
  hot:     Flame,
  warm:    Thermometer,
  cold:    Snowflake,
  at_risk: AlertTriangle,
  upsell:  TrendingUp,
}

const PIPELINE_LABEL: Record<string, string> = {
  lead:       "Lead",
  em_contato: "Em contato",
  proposta:   "Proposta",
  sucesso:    "Sucesso",
  cliente:    "Cliente ativo",
  recorrente: "Recorrente",
}

const STATUS_LABEL: Record<string, string> = {
  active:   "Ativo",
  inactive: "Inativo",
  prospect: "Prospect",
}

const COMMERCIAL_LABEL: Record<string, string> = {
  active:   "Saudável",
  at_risk:  "Em risco",
  lost:     "Perdido",
}

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { data: account, isPending: isLoading } = useAccount(tenant.id, id)
  const { data: contracts = [], isPending: contractsLoading } = useContracts(tenant.id, { accountId: id })
  const { data: accountDeals = [] } = useAccountDeals(tenant.id, id)

  async function handleDelete() {
    await deleteAccount(id)
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id] })
    router.push("/accounts")
  }

  function handleEditSuccess() {
    setEditing(false)
    qc.invalidateQueries({ queryKey: ["accounts", tenant.id, id] })
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!account) {
    return <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
  }

  const score = computeCommercialScore(account, contracts)
  const nba = computeNextBestAction(account, contracts, score)
  const ltv = computeLTV(account)
  const cfg = SCORE_CONFIG[score]
  const ScoreIcon = SCORE_ICON[score]

  const freqPerMonth = parseFrequencyPerMonth(account.frequency)
  const avgLifetime = 12

  const nbaStyle = {
    urgent: { border: "border-red-200",   bg: "bg-red-50",     iconBg: "bg-red-100",   icon: AlertCircle, iconColor: "text-red-600",   badge: "bg-red-100 text-red-700",   label: "Urgente" },
    high:   { border: "border-amber-200", bg: "bg-amber-50",   iconBg: "bg-amber-100", icon: Zap,         iconColor: "text-amber-600", badge: "bg-amber-100 text-amber-700", label: "Alta prioridade" },
    normal: { border: "border-border",    bg: "bg-muted/30",   iconBg: "bg-muted",     icon: ArrowRight,  iconColor: "text-muted-foreground", badge: "bg-muted text-muted-foreground", label: "Recomendado" },
  }[nba.priority]
  const NbaIcon = nbaStyle.icon

  const daysSinceContact = account.last_contact_at
    ? Math.floor((Date.now() - new Date(account.last_contact_at).getTime()) / 86400000)
    : null

  return (
    <div className="max-w-3xl space-y-5 pb-12">
      {/* Back */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.push("/accounts")} className="text-muted-foreground -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Contas
        </Button>
        <div className="flex gap-2">
          <Link href={`/accounts/${id}/summary`}>
            <Button variant="outline" size="sm"><BarChart2 className="w-4 h-4 mr-1" />Resumo</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4 mr-1" />Editar
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirming(true)}>
            <Trash2 className="w-4 h-4 mr-1" />Excluir
          </Button>
        </div>
      </div>

      {/* ── 1. HEADER COMERCIAL ─────────────────────────────────────────── */}
      <div className={cn("rounded-xl border p-5", cfg.bg)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold leading-tight">{account.name}</h1>
            {account.contact_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{account.contact_name}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border", cfg.bg, cfg.color)}>
                <ScoreIcon className="w-3.5 h-3.5" />
                {cfg.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 border text-muted-foreground font-medium">
                {PIPELINE_LABEL[account.pipeline_stage] ?? account.pipeline_stage}
              </span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full border font-medium",
                account.status === "active" ? "bg-green-50 text-green-700 border-green-200" :
                account.status === "prospect" ? "bg-blue-50 text-blue-700 border-blue-200" :
                "bg-gray-50 text-gray-600 border-gray-200"
              )}>
                {STATUS_LABEL[account.status]}
              </span>
            </div>
          </div>
          <div className={cn("p-3 rounded-xl bg-white/50 border shrink-0")}>
            <ScoreIcon className={cn("w-8 h-8", cfg.color)} />
          </div>
        </div>
      </div>

      {/* ── 2. AÇÃO AGORA ───────────────────────────────────────────────── */}
      <div className={cn("rounded-xl border p-4", nbaStyle.border, nbaStyle.bg)}>
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-lg shrink-0", nbaStyle.iconBg)}>
            <NbaIcon className={cn("w-5 h-5", nbaStyle.iconColor)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ação Agora</span>
              <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", nbaStyle.badge)}>
                {nbaStyle.label}
              </span>
            </div>
            <p className="text-sm font-bold">{nba.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{nba.description}</p>
          </div>
        </div>
      </div>

      {/* ── 3. VALOR DO CLIENTE (LTV) ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4 col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">LTV</p>
          {ltv != null ? (
            <>
              <p className="text-2xl font-bold text-green-700" suppressHydrationWarning>
                {ltv.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1" suppressHydrationWarning>
                R${account.estimated_value?.toLocaleString("pt-BR")} × {freqPerMonth}×/mês × {avgLifetime}m
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Ticket</p>
          <p className="text-2xl font-bold" suppressHydrationWarning>
            {account.estimated_value != null
              ? account.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
              : "—"}
          </p>
          {account.frequency && (
            <p className="text-[10px] text-muted-foreground mt-1">{account.frequency}</p>
          )}
        </div>
        <div className="bg-card border rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Último contato</p>
          <p className={cn(
            "text-2xl font-bold",
            daysSinceContact === null ? "text-muted-foreground" :
            daysSinceContact > 30 ? "text-red-600" :
            daysSinceContact > 14 ? "text-amber-600" : "text-foreground"
          )} suppressHydrationWarning>
            {daysSinceContact === null ? "—" : daysSinceContact === 0 ? "hoje" : `${daysSinceContact}d`}
          </p>
          {account.last_contact_at && (
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatDateBR(account.last_contact_at)}
            </p>
          )}
        </div>
      </div>

      {/* ── 4. BLOCO COMERCIAL ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Bloco Comercial</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <InfoTile icon={Target} label="Pipeline">{PIPELINE_LABEL[account.pipeline_stage]}</InfoTile>
          <InfoTile icon={TrendingUp} label="Status comercial">
            <span className={cn(
              "font-semibold",
              account.commercial_status === "at_risk" ? "text-red-600" :
              account.commercial_status === "lost" ? "text-gray-500" : "text-green-700"
            )}>
              {COMMERCIAL_LABEL[account.commercial_status] ?? account.commercial_status}
            </span>
          </InfoTile>
          {account.next_action && (
            <div className="col-span-2">
              <InfoTile icon={ArrowRight} label="Próxima ação">{account.next_action}</InfoTile>
            </div>
          )}
          {account.last_contact_at && (
            <InfoTile icon={Calendar} label="Último contato">
              <span>{formatDateBR(account.last_contact_at)}</span>
            </InfoTile>
          )}
          {account.frequency && (
            <InfoTile icon={RefreshCw} label="Frequência">{account.frequency}</InfoTile>
          )}
        </div>
      </section>

      {/* ── 5. OPORTUNIDADES ────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Oportunidades ({accountDeals.length})</SectionTitle>
        {accountDeals.length === 0 ? (
          <OpportunityPanel account={account} contracts={contracts} />
        ) : (
          <div className="space-y-2">
            {accountDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/deals/${deal.id}`}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${deal.stageColor}`} />
                  <span className="font-medium truncate">{deal.title}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-3">
                  {deal.value != null && (
                    <span className="text-muted-foreground text-xs">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(deal.value)}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    deal.stage === "won" ? "bg-green-100 text-green-700" :
                    deal.stage === "lost" ? "bg-red-100 text-red-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {deal.stageLabel}
                  </span>
                </div>
              </Link>
            ))}
            <OpportunityPanel account={account} contracts={contracts} />
          </div>
        )}
      </section>

      {/* ── 6. QUICK ACTIONS + TIMELINE ─────────────────────────────────── */}
      <section>
        <SectionTitle>Ações Rápidas</SectionTitle>
        <QuickActions account={account} />
      </section>

      <section>
        <SectionTitle>Histórico de atividades</SectionTitle>
        <AccountTimeline tenantId={tenant.id} accountId={id} />
      </section>

      <section>
        <SectionTitle>Timeline WhatsApp</SectionTitle>
        <WhatsAppTimeline tenantId={tenant.id} accountId={id} />
      </section>

      {/* ── 8. CONTRATOS ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Contratos ({contracts.length})</SectionTitle>
        {contractsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contrato vinculado.</p>
        ) : (
          <ContractsTable contracts={contracts} />
        )}
      </section>

      {/* ── 9. DOCUMENTOS ───────────────────────────────────────────────── */}
      <section>
        <DocumentsList tenantId={tenant.id} accountId={id} />
      </section>

      {/* ── 10. CADASTRO ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>Cadastro</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <InfoTile icon={Building2} label="Empresa">{account.name}</InfoTile>
          <InfoTile icon={Tag} label="Segmento">{account.segment ?? "—"}</InfoTile>
          <InfoTile icon={User} label="Contato">{account.contact_name ?? "—"}</InfoTile>
          <InfoTile icon={Mail} label="Email">
            {account.contact_email ? (
              <a href={`mailto:${account.contact_email}`} className="text-primary hover:underline">
                {account.contact_email}
              </a>
            ) : "—"}
          </InfoTile>
          {account.notes && (
            <div className="col-span-2">
              <InfoTile icon={AlignLeft} label="Notas">{account.notes}</InfoTile>
            </div>
          )}
          <InfoTile icon={Clock} label="Criado em">
            <span>{formatDateBR(account.created_at)}</span>
          </InfoTile>
          <InfoTile icon={Clock} label="Atualizado em">
            <span>{formatDateBR(account.updated_at)}</span>
          </InfoTile>
        </div>
      </section>

      {/* Edit dialog */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar cliente</DialogTitle></DialogHeader>
          <AccountForm
            initial={account}
            action={(formData) => updateAccount(id, formData)}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditing(false)}
            submitLabel="Salvar alterações"
            showCrmFields
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Contratos vinculados não serão excluídos automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 pt-1">
      {children}
    </h2>
  )
}

function InfoTile({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted/40 border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-muted-foreground" />
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <div className="text-sm font-medium">{children}</div>
    </div>
  )
}
