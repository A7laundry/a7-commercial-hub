"use client"

import { useState } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { loginAction, signupAction } from "./actions"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full group">
      {pending ? pendingLabel : label}
      {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
    </Button>
  )
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [tab, setTab] = useState<"login" | "signup">("login")
  const [loginState, loginFormAction] = useActionState(loginAction, { error: null })
  const [signupState, signupFormAction] = useActionState(signupAction, { error: null })
  const [googleLoading, setGoogleLoading] = useState(false)
  const searchParams = useSearchParams()
  const oauthError = searchParams.get("error")

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    // Browser will redirect — no need to reset loading state
  }

  const isLogin = tab === "login"
  const state = isLogin ? loginState : signupState
  const formAction = isLogin ? loginFormAction : signupFormAction

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          A7X
        </h1>
        <p className="text-muted-foreground mt-1">Sistema de Gestão Operacional</p>
      </div>

      <Card className="border-border/50 shadow-xl">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
          <CardHeader className="pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar Conta</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            {(state.error || oauthError) && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">
                {state.error ?? "Falha na autenticação com Google. Tente novamente."}
              </p>
            )}

            <TabsContent value="login" className="mt-0">
              <form action={loginFormAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      tabIndex={-1}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10"
                      autoComplete="current-password"
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
                <SubmitButton label="Entrar" pendingLabel="Entrando..." />
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form action={signupFormAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" name="name" placeholder="Seu nome" className="pl-10" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
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
                <SubmitButton label="Criar Conta" pendingLabel="Criando..." />
              </form>
            </TabsContent>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Redirecionando..." : "Google"}
            </Button>
          </CardContent>
        </Tabs>
      </Card>
    </motion.div>
  )
}
