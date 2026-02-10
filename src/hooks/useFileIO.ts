import { useCallback } from 'react'
import { toast } from 'sonner'
import { useFileStore } from '@/stores/file-store'
import { useUIStore } from '@/stores/ui-store'
import { readFile } from '@/core/file-io/reader'
import { validateFile } from '@/core/file-io/validator'
import { downloadBlob } from '@/core/file-io/writer'
import { convertSheetJSToUniverData } from '@/core/univer-bridge/import-adapter'
import {
  convertUniverToXlsx,
  convertUniverToCsv,
  convertUniverToPdf,
} from '@/core/univer-bridge/export-adapter'
import type { IWorkbookData, FileType } from '@/core/univer-bridge/types'
import type { CsvEncoding } from '@/core/encoding/types'

interface UseFileIOOptions {
  loadWorkbook: (data: Partial<IWorkbookData>) => void
  getSnapshot: () => IWorkbookData | null
}

export function useFileIO({ loadWorkbook, getSnapshot }: UseFileIOOptions) {
  const { setFile, setLoading, setError, setDirty } = useFileStore()
  const { setShowWelcome } = useUIStore()

  const openFile = useCallback(
    async (file: File, encoding?: CsvEncoding) => {
      setLoading(true)

      // 1. Validate
      const validation = await validateFile(file)
      if (!validation.valid) {
        setError(validation.error ?? 'ファイルを開けません')
        return
      }
      try {
        // 2. Read with SheetJS
        const result = await readFile(file, encoding)

        // 3. Convert to Univer format
        const univerData = convertSheetJSToUniverData(result.workbook)

        // 4. Load into Univer
        loadWorkbook(univerData)

        // 5. Update state
        const extStr = file.name.split('.').pop()?.toLowerCase()
        const ext: FileType = extStr === 'csv' ? 'csv' : extStr === 'xls' ? 'xls' : 'xlsx'
        setFile(file.name, ext, result.detectedEncoding)
        setShowWelcome(false)
        setDirty(false)

        // 6. 非UTF-8の場合はToast通知
        if (result.detectedEncoding && result.detectedEncoding !== 'utf-8') {
          const encodingLabel = result.detectedEncoding === 'shift_jis' ? 'Shift_JIS' : 'EUC-JP'
          toast.info(`${encodingLabel}として読み込みました`)
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'ファイルの読み込みに失敗しました',
        )
      } finally {
        setLoading(false)
      }
    },
    [loadWorkbook, setFile, setLoading, setError, setDirty, setShowWelcome],
  )

  const saveFile = useCallback(
    async (format: 'xlsx' | 'csv' | 'pdf', fileName: string, encoding?: CsvEncoding) => {
      const snapshot = getSnapshot()
      if (!snapshot) {
        setError('保存するデータがありません')
        return
      }

      setLoading(true)
      try {
        let blob: Blob
        if (format === 'xlsx') {
          blob = await convertUniverToXlsx(snapshot)
        } else if (format === 'pdf') {
          blob = convertUniverToPdf(snapshot)
        } else {
          blob = await convertUniverToCsv(snapshot, undefined, encoding)
        }
        downloadBlob(blob, fileName)
        if (format !== 'pdf') {
          setDirty(false)
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'ファイルの保存に失敗しました',
        )
      } finally {
        setLoading(false)
      }
    },
    [getSnapshot, setLoading, setError, setDirty],
  )

  return { openFile, saveFile }
}
