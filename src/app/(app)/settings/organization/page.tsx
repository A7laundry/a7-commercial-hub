"use client"

import { useState } from "react"
import { useTenant } from "@/hooks/useTenant"
import { usePlan } from "@/hooks/usePlan"
import { updateOrganizationName } from "./actions"
import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Loader2, Building2, ImageIcon } from "lucide-react"

export default function OrganizationPage() {
  const { tenant, currentUser } = useTenant()
  const planState = usePlan(tenant.id)

  const [orgName, setOrgName] = useState(tenant.name)
  const [saving, setSaving] = useState(false)

  const canEdit = ["owner", "admin"].includes(currentUser.role)

  async function handleSave() {
    if (!canEdit) return
    setSaving(true)
    const { error } = await updateOrganizationName(tenant.id, orgName)
    if (error) {
      toast.error(error)
    } else {
      toast.success("Organização atualizada")
    }
    setSaving(false)
  }

  return (
    <>
      <PageHeader title="Organização" description="Dados do seu tenant e workspace" />
      <div className="space-y-6 max-w-xl">

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Informações da organização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Nome da organização</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!canEdit}
                className={!canEdit ? "bg-muted text-muted-foreground cursor-default" : ""}
              />
              {!canEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Apenas proprietários e administradores podem editar
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={tenant.slug}
                readOnly
                className="bg-muted text-muted-foreground cursor-default font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label>ID do tenant</Label>
              <Input
                value={tenant.id}
                readOnly
                className="bg-muted text-muted-foreground cursor-default font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Membro desde</Label>
              <Input
                value={new Date(tenant.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                readOnly
                className="bg-muted text-muted-foreground cursor-default"
              />
            </div>

            {canEdit && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar alterações
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Logo da organização
            </CardTitle>
            <CardDescription>Personalize sua identidade visual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <Button variant="outline" size="sm" disabled>
                  Fazer upload
                </Button>
                <p className="text-[11px] text-muted-foreground">Em breve</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Plano atual</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            {planState.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {planState.planName}
                </Badge>
                {planState.isTrial && planState.daysLeftInTrial !== null && (
                  <span className="text-sm text-muted-foreground">
                    · trial por mais {planState.daysLeftInTrial} dias
                  </span>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
