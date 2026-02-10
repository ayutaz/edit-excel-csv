import { FolderOpen, Save, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  fileName: string | null
  isDirty: boolean
  onOpenFile: () => void
  onSaveFile: () => void
  onNewFile: () => void
}

export function Header({
  fileName,
  isDirty,
  onOpenFile,
  onSaveFile,
  onNewFile,
}: HeaderProps) {
  const displayName = fileName
    ? `${fileName}${isDirty ? " *" : ""}`
    : "Excel/CSV エディタ"

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-muted/40 px-4">
      <h1 className="text-sm font-semibold select-none">Excel/CSV エディタ</h1>

      {fileName && (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="truncate text-sm text-muted-foreground">
            {displayName}
          </span>
        </>
      )}

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={onNewFile}>
          <FilePlus className="mr-1 h-4 w-4" />
          新規作成
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenFile}>
          <FolderOpen className="mr-1 h-4 w-4" />
          開く
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSaveFile}
          disabled={!fileName && !isDirty}
        >
          <Save className="mr-1 h-4 w-4" />
          保存
        </Button>
      </div>
    </header>
  )
}
