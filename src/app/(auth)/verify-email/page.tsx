import Link from "next/link"
import { Mail } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          A7X
        </h1>
        <p className="text-muted-foreground mt-1">Sistema de Gestão Operacional</p>
      </div>

      <Card className="border-border/50 shadow-xl">
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-7 h-7 text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-lg">Confirme seu e-mail</p>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              Sua conta ainda não foi verificada. Verifique sua caixa de entrada e clique no link de confirmação que enviamos.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Não recebeu? Verifique a pasta de spam ou{" "}
            <Link href="/login" className="text-primary hover:underline">
              faça login novamente
            </Link>{" "}
            para reenviar.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full mt-2 h-9 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Voltar ao login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
