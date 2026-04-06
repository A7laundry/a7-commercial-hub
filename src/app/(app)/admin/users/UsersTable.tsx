"use client"

import { useState, useTransition } from "react"
import { adminUpdateUserRole } from "../actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Loader2, Search } from "lucide-react"

type AdminUser = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  provider: string
  tenant_name: string | null
  tenant_id: string | null
  role: string | null
}

const ROLE_COLORS: Record<string, string> = {
  owner:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
  admin:  "bg-blue-500/10 text-blue-600 border-blue-500/20",
  member: "bg-muted text-muted-foreground",
  viewer: "bg-muted text-muted-foreground",
}

const PROVIDERS: Record<string, string> = {
  email:  "Email",
  google: "Google",
  github: "GitHub",
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

export function UsersTable({ users }: { users: AdminUser[] }) {
  const [search, setSearch] = useState("")
  const [pending, startTransition] = useTransition()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const filtered = users.filter((u) =>
    [u.email, u.tenant_name, u.role].some((v) =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  )

  function handleRoleChange(user: AdminUser, role: string) {
    if (!user.tenant_id) return
    setLoadingId(user.id)
    startTransition(async () => {
      const { error } = await adminUpdateUserRole(user.id, user.tenant_id!, role)
      if (error) toast.error(error)
      else toast.success("Role atualizado")
      setLoadingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por email, org ou role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-hidden text-sm">
        <table className="w-full">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-left px-4 py-3">Provider</th>
              <th className="text-left px-4 py-3">Organização</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Último acesso</th>
              <th className="text-left px-4 py-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum usuário encontrado
                </td>
              </tr>
            )}
            {filtered.map((user) => (
              <tr key={user.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium max-w-[220px] truncate">{user.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[11px]">
                    {PROVIDERS[user.provider] ?? user.provider}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.tenant_name ?? <span className="italic text-muted-foreground/60">sem org</span>}
                </td>
                <td className="px-4 py-3">
                  {user.tenant_id ? (
                    <div className="flex items-center gap-2">
                      <Select
                        defaultValue={user.role ?? "member"}
                        onValueChange={(role) => handleRoleChange(user, role)}
                        disabled={loadingId === user.id}
                      >
                        <SelectTrigger className="h-7 text-xs w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["owner", "admin", "member", "viewer"].map((r) => (
                            <SelectItem key={r} value={r} className="text-xs capitalize">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {loadingId === user.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    </div>
                  ) : (
                    <span className="italic text-muted-foreground/60 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(user.last_sign_in_at)}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{fmt(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} de {users.length} usuários</p>
    </div>
  )
}
