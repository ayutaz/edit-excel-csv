import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { StatusBar } from '@/components/layout/StatusBar'
import { ErrorBoundary } from '@/components/layout/ErrorBoundary'
import { LoadingOverlay } from '@/components/layout/LoadingOverlay'
import { SpreadsheetContainer } from '@/components/editor/SpreadsheetContainer'
import { FileDropZone } from '@/components/dialogs/FileDropZone'
import { SaveDialog } from '@/components/dialogs/SaveDialog'
import { useFileStore } from '@/stores/file-store'
import { useUIStore } from '@/stores/ui-store'
import { useUniver } from '@/hooks/useUniver'
import { useFileIO } from '@/hooks/useFileIO'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'
import { createEmptyWorkbook } from '@/core/univer-bridge/empty-workbook'

const UNIVER_CONTAINER_ID = 'univer-container'

function App() {
  const { fileName, fileType, isDirty, isLoading, error } = useFileStore()
  const { showWelcome, setShowWelcome } = useUIStore()
  const setError = useFileStore((s) => s.setError)
  const setDirty = useFileStore((s) => s.setDirty)

  const { loadWorkbook, getSnapshot, onCellEdited, initError, isInitialized } =
    useUniver(UNIVER_CONTAINER_ID, !showWelcome)
  const { openFile, saveFile } = useFileIO({ loadWorkbook, getSnapshot })

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ブラウザ離脱警告
  useBeforeUnload()

  // エラーをToastで表示
  useEffect(() => {
    if (error) {
      toast.error(error)
      setError(null)
    }
  }, [error, setError])

  // Univer初期化エラーをToastで表示
  useEffect(() => {
    if (initError) {
      toast.error(`スプレッドシートエンジンの初期化に失敗しました: ${initError}`)
    }
  }, [initError])

  // セル編集の検知（dirty追跡）
  // isInitializedで制御し、Univerインスタンス初期化完了後にのみ登録する
  useEffect(() => {
    if (!isInitialized) return
    const disposer = onCellEdited(() => {
      setDirty(true)
    })
    return () => {
      if (typeof disposer === 'function') {
        disposer()
      } else if (disposer && 'dispose' in disposer) {
        disposer.dispose()
      }
    }
  }, [isInitialized, onCellEdited, setDirty])

  // ファイルオープン処理
  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        openFile(file).then(() => {
          toast.success('ファイルを読み込みました')
        })
      }
      e.target.value = ''
    },
    [openFile],
  )

  // D&Dからのファイル選択
  const handleFileSelected = useCallback(
    (file: File) => {
      openFile(file).then(() => {
        toast.success('ファイルを読み込みました')
      })
    },
    [openFile],
  )

  // 新規作成
  const handleNewFile = useCallback(() => {
    const emptyData = createEmptyWorkbook()
    loadWorkbook(emptyData)
    useFileStore.getState().setFile('Untitled.xlsx', 'xlsx')
    setShowWelcome(false)
    setDirty(false)
    toast.success('新しいシートを作成しました')
  }, [loadWorkbook, setShowWelcome, setDirty])

  // 保存
  const handleSaveFile = useCallback(() => {
    setSaveDialogOpen(true)
  }, [])

  const handleSaveConfirm = useCallback(
    (format: 'xlsx' | 'csv' | 'pdf', savedFileName: string) => {
      setSaveDialogOpen(false)
      saveFile(format, savedFileName).then(() => {
        toast.success('ファイルを保存しました')
      })
    },
    [saveFile],
  )

  // グローバルD&D（エディタ表示時も受け付ける）
  const handleGlobalDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
    },
    [],
  )

  const handleGlobalDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelected(file)
      }
    },
    [handleFileSelected],
  )

  return (
    <ErrorBoundary>
      <div onDragOver={handleGlobalDragOver} onDrop={handleGlobalDrop}>
        <AppShell
          header={
            <Header
              fileName={fileName}
              isDirty={isDirty}
              onOpenFile={handleOpenFile}
              onSaveFile={handleSaveFile}
              onNewFile={handleNewFile}
            />
          }
          statusBar={
            <StatusBar fileType={fileType} />
          }
        >
          {showWelcome && (
            <FileDropZone
              onFileSelected={handleFileSelected}
              onNewFile={handleNewFile}
            />
          )}
          <SpreadsheetContainer
            containerId={UNIVER_CONTAINER_ID}
            className={showWelcome ? 'hidden' : undefined}
          />
        </AppShell>

        <LoadingOverlay isLoading={isLoading} />

        <SaveDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          currentFileName={fileName}
          currentFileType={fileType}
          onSave={handleSaveConfirm}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <Toaster position="bottom-right" />
      </div>
    </ErrorBoundary>
  )
}

export default App
