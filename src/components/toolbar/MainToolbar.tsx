import { FilePlus, FolderOpen, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"

interface MainToolbarProps {
  onNewFile: () => void
  onOpenFile: () => void
  onSaveFile: () => void
  hasFile: boolean
}

export function MainToolbar({
  onNewFile,
  onOpenFile,
  onSaveFile,
  hasFile,
}: MainToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b bg-background px-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNewFile}>
              <FilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>新規作成</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenFile}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>開く</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSaveFile}
              disabled={!hasFile}
            >
              <Save className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>保存</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
