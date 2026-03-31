"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createTenantAction } from "./actions"
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

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Criando..." : "Criar workspace"}
    </Button>
  )
}

export default function OnboardingPage() {
  const [state, action] = useActionState(createTenantAction, { error: null })

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Configure seu workspace</CardTitle>
        <CardDescription>Dados da sua organização</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da organização</Label>
            <Input id="name" name="name" placeholder="A7 Lavanderia" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (identificador)</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="a7-lavanderia"
              pattern="^[a-z0-9\-]+$"
              required
            />
            <p className="text-xs text-muted-foreground">
              Só letras minúsculas, números e hífens
            </p>
          </div>
          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
