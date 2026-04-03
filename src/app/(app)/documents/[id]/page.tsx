"use client"

import { use, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useQueryClient } from "@tanstack/react-query"
import { useTenant } from "@/hooks/useTenant"
import { useDocument } from "@/hooks/documents/useDocument"
import { updateDocument, deleteDocument } from "../actions"
import { DocumentStatusBadge } from "@/components/modules/documents/DocumentStatusBadge"
import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createClient } from "@/lib/supabase/client"
import { formatDate, formatFileSize } from "@/lib/utils"
import {
  ArrowLeft,
  Building2,
  Calendar,
  Download,
  FileText,
  HardDrive,
  Hash,
  Pencil,
  Save,
  Trash2,
  X,
  FileBadge,
} from "lucide-react"

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "Contrato",
  invoice: "Fatura",
  certificate: "Certificado",
  proposal: "Proposta",
  other: "Outro",
}

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS)

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { tenant } = useTenant()
  const router = useRouter()
  const qc = useQueryClient()
  const supabase = createClient()

  const { data: doc, isPending: isLoading } = useDocument(tenant.id, id)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDocType, setEditDocType] = useState("")
  const [editExpiresAt, setEditExpiresAt] = useState("")
  const [, startSave] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)

  function startEdit() {
    if (!doc) return
    setEditName(doc.name)
    setEditDocType(doc.doc_type)
    setEditExpiresAt(doc.expires_at ? doc.expires_at.slice(0, 10) : "")
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setSaveError(null)
  }

  function handleSave() {
    if (!editName.trim()) return
    setSaveError(null)
    startSave(async () => {
      const result = await updateDocument(id, {
        name: editName.trim(),
        doc_type: editDocType,
        expires_at: editExpiresAt || null,
      })
      if (result.error) { setSaveError(result.error); return }
      setEditing(false)
      qc.invalidateQueries({ queryKey: ["documents", tenant.id, id] })
      qc.invalidateQueries({ queryKey: ["documents", tenant.id] })
    })
  }

  async function handleDownload() {
    if (!doc) return
    setDownloading(true)
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60)
    setDownloading(false)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  async function handleDelete() {
    if (!doc) return
    await deleteDocument(id, doc.storage_path)
    qc.invalidateQueries({ queryKey: ["documents", tenant.id] })
    router.push("/documents")
  }

  const mimeLabel = doc?.mime_type
    ? doc.mime_type.split("/").pop()?.toUpperCase() ?? doc.mime_type
    : null

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title={isLoading ? "Documento" : (doc?.name ?? "Documento")}
        description={isLoading ? "" : (DOC_TYPE_LABELS[doc?.doc_type ?? ""] ?? doc?.doc_type ?? "")}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/documents"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Documentos
            </Link>
            {!isLoading && doc && !editing && (
              <>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  {downloading ? "Gerando link..." : "Download"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !doc ? (
        <p className="text-sm text-muted-foreground">Documento não encontrado.</p>
      ) : (
        <div className="space-y-5">
          {/* Status */}
          <div className="flex items-center gap-3">
            <DocumentStatusBadge expires_at={doc.expires_at} />
            {mimeLabel && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {mimeLabel}
              </span>
            )}
          </div>

          {/* Info / Edit panel */}
          <div className="border rounded-lg p-5">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Nome <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Tipo
                    </label>
                    <Select value={editDocType} onValueChange={(v) => setEditDocType(v ?? "")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOC_TYPES.map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Data de vencimento
                    </label>
                    <Input
                      type="date"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                    />
                  </div>
                </div>
                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!editName.trim()}>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Tipo
                  </dt>
                  <dd className="font-medium">
                    {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Vencimento
                  </dt>
                  <dd className="font-medium">
                    {doc.expires_at ? formatDate(doc.expires_at) : "Sem vencimento"}
                  </dd>
                </div>

                {doc.account_id && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Conta
                    </dt>
                    <dd>
                      <Link
                        href={`/accounts/${doc.account_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {(doc as Document & { account_name?: string }).account_name ?? doc.account_id}
                      </Link>
                    </dd>
                  </div>
                )}

                {doc.contract_id && (
                  <div>
                    <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                      <FileBadge className="w-3.5 h-3.5" /> Contrato
                    </dt>
                    <dd>
                      <Link
                        href={`/contracts/${doc.contract_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {(doc as Document & { contract_title?: string }).contract_title ?? "Ver contrato"}
                      </Link>
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" /> Tamanho
                  </dt>
                  <dd>{formatFileSize(doc.size_bytes)}</dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" /> Versão
                  </dt>
                  <dd>v{doc.version}</dd>
                </div>

                <div>
                  <dt className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Enviado em
                  </dt>
                  <dd>{formatDate(doc.created_at)}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* Download CTA */}
          {!editing && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-dashed">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {mimeLabel && `${mimeLabel} · `}{formatFileSize(doc.size_bytes)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={downloading}
                className="shrink-0"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {downloading ? "Aguarde..." : "Baixar arquivo"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo &quot;{doc?.name}&quot; será removido permanentemente do armazenamento. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Local re-export to satisfy TypeScript narrowing in JSX
type Document = import("@/types").Document
