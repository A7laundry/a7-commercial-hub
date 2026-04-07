"use client"

import { useState, useTransition } from "react"
import { adminUpdateOrgName } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Search, Pencil, Check, X, Loader2 } from "lucide-react"
import { formatDateBR } from "@/lib/format"

type AdminOrg = {
  id: string
  name: string
  slug: string
  created_at: string
  owner_email: string | null
  member_count: number
  plan: string
  status: string
  whatsapp_connected: boolean
}

const STATUS_COLORS: Record<string, string> = {
  active:   "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  trialing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  past_due: "bg-red-500/10 text-red-600 border-red-500/20",
  canceled: "bg-muted text-muted-foreground",
  free:     "bg-muted text-muted-foreground",
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free", pro: "Pro", scale: "Scale",
}

function EditableName({ org }: { org: AdminOrg }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(org.name)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      const { error } = await adminUpdateOrgName(org.id, value)
      if (error) { toast.error(error); setValue(org.name) }
      else { toast.success("Nome atualizado"); setEditing(false) }
    })
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="font-medium">{value}</span>
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          <Pencil className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 text-sm w-40"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setEditing(false); setValue(org.name) } }}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={pending}>
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 text-emerald-500" />}
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(false); setValue(org.name) }}>
        <X className="w-3 h-3 text-muted-foreground" />
      </Button>
    </div>
  )
}

export function OrgsTable({ orgs }: { orgs: AdminOrg[] }) {
  const [search, setSearch] = useState("")

  const filtered = orgs.filter((o) =>
    [o.name, o.slug, o.owner_email, o.plan, o.status].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar org, owner, plano..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Organização</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Membros</th>
              <th className="text-left px-4 py-3">Plano</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">WhatsApp</th>
              <th className="text-left px-4 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  Nenhuma organização encontrada
                </td>
              </tr>
            )}
            {filtered.map((org) => (
              <tr key={org.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <EditableName org={org} />
                  <p className="text-[11px] text-muted-foreground font-mono">{org.slug}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs max-w-[200px] truncate">
                  {org.owner_email ?? <span className="italic text-muted-foreground/60">sem owner</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{org.member_count}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[11px]">
                    {PLAN_LABELS[org.plan] ?? org.plan}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge className={`text-[11px] border ${STATUS_COLORS[org.status] ?? ""}`}>
                    {org.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${org.whatsapp_connected ? "text-emerald-500" : "text-muted-foreground/60"}`}>
                    {org.whatsapp_connected ? "✓ conectado" : "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {formatDateBR(org.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {orgs.length} organizações</p>
    </div>
  )
}
