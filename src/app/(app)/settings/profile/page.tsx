"use client"

import { useState, useEffect } from "react"
import { useTenant } from "@/hooks/useTenant"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, User, Mail, ShieldCheck } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
}

export default function ProfilePage() {
  const { currentUser } = useTenant()
  const supabase = createClient()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [fullName, setFullName] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  // Password form
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        setFullName(data.user.user_metadata?.full_name ?? "")
      }
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmailProvider = user?.identities?.some((i) => i.provider === "email") ?? false
  const providers = user?.identities?.map((i) => i.provider) ?? []

  async function handleSaveProfile() {
    setSavingProfile(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    })
    if (error) {
      toast.error("Erro ao salvar: " + error.message)
    } else {
      toast.success("Perfil atualizado")
    }
    setSavingProfile(false)
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem")
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error("Erro ao trocar senha: " + error.message)
    } else {
      toast.success("Senha alterada com sucesso")
      setNewPassword("")
      setConfirmPassword("")
    }
    setSavingPassword(false)
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Perfil" description="Suas informações pessoais" />
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Perfil" description="Suas informações pessoais" />
      <div className="space-y-6 max-w-xl">

        {/* Identity card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Informações pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  value={currentUser.email}
                  readOnly
                  className="bg-muted text-muted-foreground cursor-default"
                />
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Controlado pelo provedor de autenticação
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nome de exibição</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Função na organização</Label>
              <div>
                <Badge variant="secondary">
                  {ROLE_LABEL[currentUser.role] ?? currentUser.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Login via</Label>
              <div className="flex gap-2 flex-wrap">
                {providers.map((p) => (
                  <Badge key={p} variant="outline" className="capitalize gap-1.5">
                    <ShieldCheck className="w-3 h-3" />
                    {p === "email" ? "Email / senha" : p}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              size="sm"
            >
              {savingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        {/* Password change — only for email provider */}
        {isEmailProvider && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Trocar senha</CardTitle>
              <CardDescription>Defina uma nova senha para sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
                size="sm"
                variant="outline"
              >
                {savingPassword && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Alterar senha
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
