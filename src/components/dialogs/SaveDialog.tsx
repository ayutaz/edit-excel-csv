import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { CsvEncoding } from "@/core/encoding/types"

type SaveFormat = "xlsx" | "csv" | "pdf"

interface SaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentFileName: string | null
  currentFileType: string | null
  onSave: (format: SaveFormat, fileName: string, encoding?: CsvEncoding) => void
}

function stripExtension(name: string): string {
  return name.replace(/\.(xlsx|xls|csv|pdf)$/i, "")
}

export function SaveDialog({
  open,
  onOpenChange,
  currentFileName,
  currentFileType,
  onSave,
}: SaveDialogProps) {
  const defaultFormat: SaveFormat =
    currentFileType === "csv" ? "csv" : "xlsx"

  const [format, setFormat] = useState<SaveFormat>(defaultFormat)
  const [baseName, setBaseName] = useState("")
  const [csvEncoding, setCsvEncoding] = useState<CsvEncoding>("utf-8")

  useEffect(() => {
    if (open) {
      setFormat(defaultFormat)
      setBaseName(
        currentFileName ? stripExtension(currentFileName) : "Untitled"
      )
      setCsvEncoding("utf-8")
    }
  }, [open, currentFileName, defaultFormat])

  const fullFileName = useMemo(
    () => `${baseName}.${format}`,
    [baseName, format]
  )

  const handleSave = () => {
    if (!baseName.trim()) return
    onSave(format, fullFileName, format === "csv" ? csvEncoding : undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ファイルを保存</DialogTitle>
          <DialogDescription>
            ファイル名と保存形式を選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="save-filename">ファイル名</Label>
            <Input
              id="save-filename"
              value={baseName}
              onChange={(e) => setBaseName(e.target.value)}
              placeholder="ファイル名を入力"
            />
            <p className="text-xs text-muted-foreground">
              保存先: {fullFileName}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>保存形式</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={format === "xlsx" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("xlsx")}
                className={cn("flex-1")}
              >
                XLSX
              </Button>
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("csv")}
                className={cn("flex-1")}
              >
                CSV
              </Button>
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                size="sm"
                onClick={() => setFormat("pdf")}
                className={cn("flex-1")}
              >
                PDF
              </Button>
            </div>
            {format === "pdf" && (
              <p className="text-xs text-muted-foreground">
                PDF形式は印刷用の読み取り専用フォーマットです。初回のPDF生成時にフォントデータをダウンロードします。
              </p>
            )}
          </div>

          {format === "csv" && (
            <div className="grid gap-2">
              <Label>文字エンコーディング</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={csvEncoding === "utf-8" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvEncoding("utf-8")}
                  className={cn("flex-1")}
                >
                  UTF-8
                </Button>
                <Button
                  type="button"
                  variant={csvEncoding === "shift_jis" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvEncoding("shift_jis")}
                  className={cn("flex-1")}
                >
                  Shift_JIS
                </Button>
                <Button
                  type="button"
                  variant={csvEncoding === "euc-jp" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCsvEncoding("euc-jp")}
                  className={cn("flex-1")}
                >
                  EUC-JP
                </Button>
              </div>
              {csvEncoding !== "utf-8" && (
                <p className="text-xs text-muted-foreground">
                  Excel等での互換性のためUTF-8（BOM付き）を推奨します。
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={!baseName.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
