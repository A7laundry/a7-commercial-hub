"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTenant } from "@/hooks/useTenant"
import { cn } from "@/lib/utils"
import { Search, Building2, Target, FileText, ArrowRight, X } from "lucide-react"

type ResultItem = {
  id: string
  label: string
  sub: string
  href: string
  type: "account" | "deal" | "contract"
}

const TYPE_CONFIG = {
  account:  { icon: Building2, color: "text-blue-600",   bg: "bg-blue-50",    label: "Conta" },
  deal:     { icon: Target,    color: "text-purple-600", bg: "bg-purple-50",  label: "Oportunidade" },
  contract: { icon: FileText,  color: "text-emerald-600",bg: "bg-emerald-50", label: "Contrato" },
}

export function CommandPalette() {
  const { tenant } = useTenant()
  const router = useRouter()
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Keyboard shortcut ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery("")
      setResults([])
      setActiveIdx(0)
    }
  }, [open])

  // ── Search ─────────────────────────────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const like = `%${q.trim()}%`

    const [accountsRes, dealsRes, contractsRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("id, name, contact_name, status")
        .eq("tenant_id", tenant.id)
        .ilike("name", like)
        .limit(5),
      supabase
        .from("deals")
        .select("id, title, stage")
        .eq("tenant_id", tenant.id)
        .ilike("title", like)
        .not("stage", "in", '("won","lost")')
        .limit(4),
      supabase
        .from("contracts")
        .select("id, title")
        .eq("tenant_id", tenant.id)
        .ilike("title", like)
        .limit(3),
    ])

    const items: ResultItem[] = [
      ...(accountsRes.data ?? []).map((a) => ({
        id: a.id,
        label: a.name,
        sub: a.contact_name ?? (a.status === "prospect" ? "Prospect" : "Cliente"),
        href: `/accounts/${a.id}`,
        type: "account" as const,
      })),
      ...(dealsRes.data ?? []).map((d) => ({
        id: d.id,
        label: d.title,
        sub: d.stage,
        href: `/deals/${d.id}`,
        type: "deal" as const,
      })),
      ...(contractsRes.data ?? []).map((c) => ({
        id: c.id,
        label: c.title,
        sub: "Contrato",
        href: `/contracts/${c.id}`,
        type: "contract" as const,
      })),
    ]

    setResults(items)
    setActiveIdx(0)
    setLoading(false)
  }, [tenant.id, supabase])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  function navigate(item: ResultItem) {
    router.push(item.href)
    setOpen(false)
  }

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[activeIdx]) {
      navigate(results[activeIdx])
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-popover border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            onKeyDown={onKeyDownInput}
            placeholder="Buscar clientes, oportunidades, contratos..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setResults([]) }}>
              <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-6">Buscando...</p>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum resultado para "{query}"
            </p>
          )}

          {!loading && query.length < 2 && (
            <div className="px-4 py-4 space-y-1">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mb-3">Acesso rápido</p>
              {[
                { label: "Minha Fila", href: "/execution", sub: "Ações prioritárias" },
                { label: "Inbox WhatsApp", href: "/inbox", sub: "Conversas" },
                { label: "Nova oportunidade", href: "/deals", sub: "Funil de vendas" },
                { label: "Campanhas", href: "/campaigns", sub: "Disparos em massa" },
              ].map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => { router.push(item.href); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-1">
              {results.map((item, idx) => {
                const cfg = TYPE_CONFIG[item.type]
                const Icon = cfg.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left",
                      idx === activeIdx ? "bg-muted" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", cfg.bg)}>
                      <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.sub}</p>
                    </div>
                    <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0", cfg.bg, cfg.color)}>
                      {cfg.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t px-4 py-2 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>esc fechar</span>
          <span className="ml-auto">⌘K para abrir</span>
        </div>
      </div>
    </div>
  )
}
