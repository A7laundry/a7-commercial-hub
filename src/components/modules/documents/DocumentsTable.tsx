"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { deleteDocument } from "@/app/(app)/documents/actions"
import { DocumentStatusBadge } from "./DocumentStatusBadge"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate, formatFileSize } from "@/lib/utils"
import type { Document } from "@/types"

const DOC_TYPE_LABELS: Record<string, string> = {
  contract: "Contrato",
  invoice: "Fatura",
  certificate: "Certificado",
  proposal: "Proposta",
  other: "Outro",
}

type DocumentsTableProps = {
  documents: Document[]
  isLoading?: boolean
  onDeleted?: () => void
}

export function DocumentsTable({ documents, isLoading, onDeleted }: DocumentsTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const docToDelete = documents.find((d) => d.id === deletingId)

  async function getDownloadUrl(storagePath: string) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, "_blank")
  }

  function handleDelete() {
    if (!docToDelete) return
    startTransition(async () => {
      await deleteDocument(docToDelete.id, docToDelete.storage_path)
      setDeletingId(null)
      onDeleted?.()
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) return null

  return (
    <>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Nome</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tipo</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Vencimento</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tamanho</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <td className="py-3 px-4 font-medium max-w-[200px] truncate">{doc.name}</td>
                <td className="py-3 px-4 text-muted-foreground">
                  {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {doc.expires_at ? formatDate(doc.expires_at) : "—"}
                </td>
                <td className="py-3 px-4">
                  <DocumentStatusBadge expires_at={doc.expires_at} />
                </td>
                <td className="py-3 px-4 text-muted-foreground">{formatFileSize(doc.size_bytes)}</td>
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => getDownloadUrl(doc.storage_path)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir documento</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo &quot;{docToDelete?.name}&quot; será removido permanentemente do armazenamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
