"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, ShieldCheck, KeyRound, LogOut, Info } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export default function SecurityPage() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEmailProvider = user?.identities?.some((i) => i.provider === "email") ?? false
  const providers = user?.identities?.map((i) => i.provider) ?? []
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString("pt-BR")
    : null

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

  async function handleSignOutOthers() {
    setSigningOut(true)
    const { error } = await supabase.auth.signOut({ scope: "others" })
    if (error) {
      toast.error("Erro: " + error.message)
    } else {
      toast.success("Outras sessões encerradas")
    }
    setSigningOut(false)
  }

  async function handleSignOutAll() {
    setSigningOut(true)
    await supabase.auth.signOut({ scope: "global" })
    router.push("/login")
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Segurança" description="Acesso e sessões da sua conta" />
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Segurança" description="Acesso e sessões da sua conta" />
      <div className="space-y-6 max-w-xl">

        {/* Auth method */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Método de autenticação
            </CardTitle>
            <CardDescription>Como você acessa o sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {providers.map((p) => (
                <Badge key={p} variant="outline" className="capitalize gap-1.5">
                  <ShieldCheck className="w-3 h-3" />
                  {p === "email" ? "Email / senha" : p}
                </Badge>
              ))}
            </div>
            {lastSignIn && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Último login em {lastSignIn}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Password change */}
        {isEmailProvider ? (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Trocar senha
              </CardTitle>
              <CardDescription>Atualize sua senha de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="newPwd">Nova senha</Label>
                <Input
                  id="newPwd"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPwd">Confirmar senha</Label>
                <Input
                  id="confirmPwd"
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
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="w-4 h-4" />
                Senha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sua conta usa autenticação via{" "}
                <span className="font-medium capitalize">{providers.filter((p) => p !== "email").join(", ")}</span>.
                A senha é gerenciada pelo provedor externo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Sessions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sessões
            </CardTitle>
            <CardDescription>Gerencie onde sua conta está conectada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/60">
              <div>
                <p className="text-sm font-medium">Sessão atual</p>
                {lastSignIn && (
                  <p className="text-[11px] text-muted-foreground">Iniciada em {lastSignIn}</p>
                )}
              </div>
              <Badge variant="secondary" className="text-[10px]">Ativa</Badge>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOutOthers}
                disabled={signingOut}
              >
                {signingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Encerrar outras sessões
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOutAll}
                disabled={signingOut}
                className="w-fit"
              >
                {signingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sair de todos os dispositivos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
