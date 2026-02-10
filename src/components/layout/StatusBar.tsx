import { ShieldCheck } from "lucide-react"
import type { CsvEncoding } from "@/core/encoding/types"

interface StatusBarProps {
  fileType: string | null
  encoding: CsvEncoding | null
}

const encodingLabel: Record<CsvEncoding, string> = {
  'utf-8': 'UTF-8',
  'shift_jis': 'SHIFT_JIS',
  'euc-jp': 'EUC-JP',
}

export function StatusBar({ fileType, encoding }: StatusBarProps) {
  return (
    <footer data-testid="app-footer" className="flex h-7 shrink-0 items-center gap-3 border-t bg-muted/40 px-4 text-xs text-muted-foreground">
      {fileType && (
        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium uppercase text-secondary-foreground">
          {fileType}
        </span>
      )}

      {encoding && (
        <span className="rounded bg-secondary px-1.5 py-0.5 font-medium text-secondary-foreground">
          {encodingLabel[encoding]}
        </span>
      )}

      <span className="ml-auto flex items-center gap-1">
        <ShieldCheck className="h-3.5 w-3.5" />
        データはブラウザ内で処理されます。サーバーには送信されません。
      </span>
    </footer>
  )
}
