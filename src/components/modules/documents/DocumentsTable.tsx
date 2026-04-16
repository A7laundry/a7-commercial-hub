"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Download, FileText } from "lucide-react"
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
import { formatDate, formatFileSize, cn } from "@/lib/utils"
import type { Document } from "@/types"

// Static label maps — outside component
const DOC_TYPE_LABELS: Record<string, string> = {
  contract:    "Contrato",
  invoice:     "Fatura",
  certificate: "Certificado",
  proposal:    "Proposta",
  other:       "Outro",
}

const DOC_TYPE_COLOR: Record<string, string> = {
  contract:    "text-[#022448]",
  invoice:     "text-emerald-600",
  certificate: "text-purple-600",
  proposal:    "text-amber-600",
  other:       "text-slate-400",
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
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (documents.length === 0) return null

  return (
    <>
      <div className="rounded-xl border border-border bg-white shadow-[0_2px_16px_rgba(2,36,72,0.06)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[#f8f9fa]">
              <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vencimento</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tamanho</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-b last:border-0 hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <td className="py-3 px-4 max-w-[200px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={cn("w-4 h-4 shrink-0", DOC_TYPE_COLOR[doc.doc_type] ?? "text-slate-400")} />
                    <span className="font-semibold text-[#022448] truncate">{doc.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#022448]/8 text-[#022448]/70 ring-1 ring-[#022448]/10">
                    {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    {doc.expires_at ? formatDate(doc.expires_at) : "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <DocumentStatusBadge expires_at={doc.expires_at} />
                </td>
                <td className="py-3 px-4">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatFileSize(doc.size_bytes)}
                  </span>
                </td>
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-[#022448]/8 hover:text-[#022448]"
                      onClick={() => getDownloadUrl(doc.storage_path)}
                      title="Baixar"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50"
                      onClick={() => setDeletingId(doc.id)}
                      title="Excluir"
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
