"use client"

import { useState, useActionState } from "react"
import { portalLoginAction, portalMagicLinkAction } from "./actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Lock, Sparkles } from "lucide-react"

export default function PortalLoginPage() {
  const [mode, setMode] = useState<"password" | "magic">("password")

  const [pwState, pwAction, pwPending] = useActionState(portalLoginAction, { error: null })
  const [magicState, magicAction, magicPending] = useActionState(portalMagicLinkAction, { error: null })

  const isPending = pwPending || magicPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground text-lg font-bold">A7</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acesse seus contratos, documentos e informações.
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          {/* Mode toggle */}
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                mode === "password"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Senha
            </button>
            <button
              type="button"
              onClick={() => setMode("magic")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                mode === "magic"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Link mágico
            </button>
          </div>

          {mode === "password" && (
            <form action={pwAction} className="space-y-4">
              {pwState.error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {pwState.error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="pw-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="pw-email" name="email" type="email" placeholder="seu@email.com" className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pw-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="pw-password" name="password" type="password" placeholder="••••••••" className="pl-9" required />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {pwPending ? <><Loader2 className="w-4 h-4 animate-spin" />Entrando...</> : "Entrar"}
              </button>
            </form>
          )}

          {mode === "magic" && (
            <form action={magicAction} className="space-y-4">
              {magicState.error && (
                <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {magicState.error}
                </div>
              )}
              {magicState.message && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">
                  {magicState.message}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="magic-email" name="email" type="email" placeholder="seu@email.com" className="pl-9" required />
                </div>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {magicPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
                  : <><Sparkles className="w-4 h-4" />Enviar link de acesso</>
                }
              </button>
              <p className="text-xs text-center text-muted-foreground">
                Você receberá um link por email para entrar sem senha.
              </p>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Acesso exclusivo para clientes cadastrados.
        </p>
      </div>
    </div>
  )
}
