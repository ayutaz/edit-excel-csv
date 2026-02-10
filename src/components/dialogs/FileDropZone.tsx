import { useCallback, useRef, useState } from "react"
import { Upload, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileDropZoneProps {
  onFileSelected: (file: File) => void
  onNewFile: () => void
}

const ACCEPT = ".xlsx,.xls,.csv"

export function FileDropZone({ onFileSelected, onNewFile }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!isDragOver) setIsDragOver(true)
    },
    [isDragOver]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
    },
    []
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFileSelected(file)
      // input をリセットして同じファイルを再選択可能にする
      e.target.value = ""
    },
    [onFileSelected]
  )

  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "flex w-full max-w-md flex-col items-center gap-6 rounded-xl border-2 border-dashed p-12 transition-colors",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        )}
      >
        <Upload
          className={cn(
            "h-12 w-12",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )}
        />

        <div className="text-center">
          <p className="text-lg font-medium">ファイルをドラッグ＆ドロップ</p>
          <p className="mt-1 text-sm text-muted-foreground">
            .xlsx, .xls, .csv に対応
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px w-12 bg-border" />
          <span className="text-sm text-muted-foreground">または</span>
          <div className="h-px w-12 bg-border" />
        </div>

        <Button onClick={() => inputRef.current?.click()}>
          ファイルを選択
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className="hidden"
        />

        <Button variant="outline" onClick={onNewFile}>
          <FilePlus className="mr-1 h-4 w-4" />
          新規作成
        </Button>
      </div>
    </div>
  )
}
