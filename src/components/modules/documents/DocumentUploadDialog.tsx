"use client"

import { useState, useRef, useTransition } from "react"
import { Upload, X, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { createDocumentRecord } from "@/app/(app)/documents/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatFileSize } from "@/lib/utils"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]
const MAX_SIZE = 25 * 1024 * 1024 // 25MB

type DocumentUploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  accountId?: string
  contractId?: string
  onSuccess: () => void
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  tenantId,
  accountId,
  contractId,
  onSuccess,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("")
  const [docName, setDocName] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  function handleFile(f: File) {
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Tipo de arquivo não permitido. Use PDF, DOCX, XLSX, PNG ou JPG.")
      return
    }
    if (f.size > MAX_SIZE) {
      setError("Arquivo muito grande. Tamanho máximo: 25MB.")
      return
    }
    setError(null)
    setFile(f)
    if (!docName) setDocName(f.name.replace(/\.[^/.]+$/, ""))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  function reset() {
    setFile(null)
    setDocType("")
    setDocName("")
    setExpiresAt("")
    setError(null)
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType || !docName) return

    startTransition(async () => {
      const ext = file.name.split(".").pop()
      const storagePath = `${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const formData = new FormData()
      formData.set("name", docName)
      formData.set("doc_type", docType)
      formData.set("storage_path", storagePath)
      formData.set("mime_type", file.type)
      formData.set("size_bytes", String(file.size))
      if (expiresAt) formData.set("expires_at", expiresAt)
      if (accountId) formData.set("account_id", accountId)
      if (contractId) formData.set("contract_id", contractId)

      const result = await createDocumentRecord(formData)
      if (result.error) {
        // Rollback storage upload on DB error
        await supabase.storage.from("documents").remove([storagePath])
        setError(result.error)
        return
      }

      reset()
      onSuccess()
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar documento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          {/* Drop zone */}
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo ou <span className="text-primary underline">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PNG, JPG — máx. 25MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
              <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="docName">Nome do documento *</Label>
            <Input
              id="docName"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Ex: Contrato de Prestação de Serviços"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v ?? "")} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contrato</SelectItem>
                <SelectItem value="invoice">Fatura</SelectItem>
                <SelectItem value="certificate">Certificado</SelectItem>
                <SelectItem value="proposal">Proposta</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Data de vencimento</Label>
            <Input
              id="expiresAt"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!file || !docType || !docName || isPending}>
              {isPending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
