import { ShieldCheck } from "lucide-react"

interface StatusBarProps {
  fileType: string | null
}

export function StatusBar({ fileType }: StatusBarProps) {
  return (
    <footer data-testid="app-footer" className="flex h-7 shrink-0 items-center gap-3 border-t bg-muted/40 px-4 text-xs text-muted-foreground">
      {fileType && (
        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium uppercase text-secondary-foreground">
          {fileType}
        </span>
      )}

      <span className="ml-auto flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" />
        データはブラウザ内で処理されます。サーバーには送信されません。
      </span>
    </footer>
  )
}
