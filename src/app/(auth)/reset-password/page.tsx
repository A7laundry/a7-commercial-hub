"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { updatePasswordAction, type ResetState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Lock, Eye, EyeOff, ArrowRight } from "lucide-react"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full group">
      {pending ? "Salvando..." : "Salvar nova senha"}
      {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
    </Button>
  )
}

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction] = useActionState<ResetState, FormData>(updatePasswordAction, { error: null })

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          A7X
        </h1>
        <p className="text-muted-foreground mt-1">Sistema de Gestão Operacional</p>
      </div>

      <Card className="border-border/50 shadow-xl">
        <CardHeader className="pb-2">
          <p className="font-semibold text-foreground">Nova senha</p>
          <p className="text-sm text-muted-foreground">Escolha uma senha segura para sua conta.</p>
        </CardHeader>
        <CardContent className="pt-2">
          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
              {state.error}
            </p>
          )}
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10 pr-10"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm"
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repita a senha"
                  className="pl-10"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
