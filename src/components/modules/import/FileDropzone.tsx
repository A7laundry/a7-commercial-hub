"use client"

import { useCallback, useState } from "react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { Upload, FileSpreadsheet, AlertTriangle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RawRow } from "@/lib/import/normalizer"

type Props = {
  onParsed: (headers: string[], rows: RawRow[], fileName: string) => void
}

type FileStatus = "idle" | "parsing" | "done" | "error"

export function FileDropzone({ onParsed }: Props) {
  const [status, setStatus] = useState<FileStatus>("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const parseFile = useCallback(
    async (file: File) => {
      setFileName(file.name)
      setStatus("parsing")
      setError(null)

      const ext = file.name.split(".").pop()?.toLowerCase()

      try {
        if (ext === "csv" || ext === "txt") {
          await parseCSV(file, onParsed)
        } else if (ext === "xlsx" || ext === "xls") {
          parseExcel(file, onParsed)
        } else {
          throw new Error(`Formato .${ext} não suportado. Use CSV, TXT ou Excel (.xlsx, .xls).`)
        }
        setStatus("done")
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao processar arquivo")
        setStatus("error")
      }
    },
    [onParsed]
  )

  function parseCSV(file: File, cb: Props["onParsed"]) {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (result) => {
          if (!result.data.length) {
            reject(new Error("Arquivo vazio ou sem dados legíveis."))
            return
          }
          const headers = result.meta.fields ?? []
          cb(headers, result.data as RawRow[], file.name)
          resolve()
        },
        error: (err) => reject(new Error(err.message)),
      })
    })
  }

  function parseExcel(file: File, cb: Props["onParsed"]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: "array", cellDates: true })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const json = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: "" })
      if (!json.length) throw new Error("Planilha vazia.")
      const headers = Object.keys(json[0])
      cb(headers, json, file.name)
    }
    reader.readAsArrayBuffer(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center gap-3">
          {status === "parsing" ? (
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-7 h-7 text-primary" />
            </div>
          )}

          {status === "idle" && (
            <>
              <div>
                <p className="text-base font-semibold">Arraste seu arquivo aqui</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ou clique para selecionar
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV, Excel (.xlsx / .xls), TXT</span>
              </div>
            </>
          )}

          {status === "parsing" && (
            <p className="text-sm text-muted-foreground">Processando {fileName}...</p>
          )}

          {status === "done" && (
            <div className="text-center">
              <p className="text-sm font-medium text-green-700">{fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Arquivo lido com sucesso.{" "}
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={(e) => { e.stopPropagation(); setStatus("idle"); setFileName(null) }}
                >
                  Trocar arquivo
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {status === "error" && error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-md">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro ao processar arquivo</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
          <button type="button" className="ml-auto" onClick={() => setStatus("idle")}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-muted/40 rounded-lg p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Formatos aceitos
        </p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• <strong>CSV / TXT</strong> — exportação do Google Sheets, Excel, sistemas legados</li>
          <li>• <strong>Excel</strong> (.xlsx, .xls) — planilhas diretamente do Google Drive / OneDrive</li>
          <li>• PDFs: <span className="text-amber-600">converta para CSV antes de importar</span></li>
        </ul>
      </div>
    </div>
  )
}
