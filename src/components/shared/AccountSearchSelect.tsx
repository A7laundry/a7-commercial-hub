"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Building2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type AccountOption = {
  id: string
  name: string
  pipeline_stage?: string
  status?: string
}

type Props = {
  value: AccountOption | null
  onChange: (v: AccountOption | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Filter by account status (optional) */
  status?: string
}

const PIPELINE_LABEL: Record<string, string> = {
  lead:       "Lead",
  em_contato: "Em contato",
  proposta:   "Proposta",
  sucesso:    "Sucesso",
  cliente:    "Cliente ativo",
  recorrente: "Recorrente",
}

export function AccountSearchSelect({
  value,
  onChange,
  placeholder = "Buscar conta...",
  disabled = false,
  className,
  status,
}: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AccountOption[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchResults = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, limit: "20" })
      if (status) params.set("status", status)
      const res = await fetch(`/api/accounts/search?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setResults(json.accounts ?? [])
      setActiveIdx(-1)
    } finally {
      setLoading(false)
    }
  }, [status])

  // Debounced fetch on query change
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchResults(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, open, fetchResults])

  // Load initial results when dropdown opens
  useEffect(() => {
    if (open && results.length === 0 && !loading) {
      fetchResults("")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") setOpen(true)
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (activeIdx >= 0 && results[activeIdx]) {
        select(results[activeIdx])
      }
    } else if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return
    const el = listRef.current.children[activeIdx] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIdx])

  function select(account: AccountOption) {
    onChange(account)
    setQuery("")
    setResults([])
    setOpen(false)
    inputRef.current?.blur()
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(null)
    setQuery("")
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const displayValue = value?.name ?? ""

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div
        className={cn(
          "flex items-center gap-2 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors",
          "focus-within:ring-1 focus-within:ring-ring",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus() } }}
      >
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {value && !open ? (
          <span className="flex-1 truncate text-sm">{displayValue}</span>
        ) : (
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value ? displayValue : placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
            autoComplete="off"
          />
        )}
        {loading && <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />}
        {value && !loading && (
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground shrink-0"
            tabIndex={-1}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto py-1"
            role="listbox"
          >
            {loading && results.length === 0 ? (
              <li className="flex items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </li>
            ) : results.length === 0 ? (
              <li className="py-6 text-sm text-muted-foreground text-center">
                {query.length >= 1 ? "Nenhuma conta encontrada" : "Digite para buscar"}
              </li>
            ) : (
              results.map((account, i) => (
                <li
                  key={account.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={(e) => { e.preventDefault(); select(account) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 cursor-pointer text-sm",
                    i === activeIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                  )}
                >
                  <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{account.name}</p>
                    {account.pipeline_stage && (
                      <p className="text-[11px] text-muted-foreground">
                        {PIPELINE_LABEL[account.pipeline_stage] ?? account.pipeline_stage}
                      </p>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
