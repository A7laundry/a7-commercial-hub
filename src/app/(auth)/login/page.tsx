"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { loginAction, signupAction } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [loginState, loginFormAction] = useActionState(loginAction, { error: null })
  const [signupState, signupFormAction] = useActionState(signupAction, { error: null })

  const isLogin = mode === "login"
  const state = isLogin ? loginState : signupState
  const formAction = isLogin ? loginFormAction : signupFormAction

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-bold">A7</span>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Commercial Hub
          </span>
        </div>
        <CardTitle className="text-2xl">{isLogin ? "Entrar" : "Criar conta"}</CardTitle>
        <CardDescription>
          {isLogin ? "Acesse sua conta" : "Cadastre-se para começar"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {state.error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={isLogin ? "" : "mínimo 6 caracteres"}
            />
          </div>
          <SubmitButton
            label={isLogin ? "Entrar" : "Criar conta"}
            pendingLabel={isLogin ? "Entrando..." : "Criando..."}
          />
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => setMode(isLogin ? "signup" : "login")}
          >
            {isLogin ? "Criar conta" : "Entrar"}
          </button>
        </p>
      </CardContent>
    </Card>
  )
}
