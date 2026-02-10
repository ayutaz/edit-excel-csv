import { create } from 'zustand'
import type { FileType } from '@/core/univer-bridge/types'
import type { CsvEncoding } from '@/core/encoding/types'

interface FileState {
  fileName: string | null
  fileType: FileType | null
  encoding: CsvEncoding | null
  isDirty: boolean
  isLoading: boolean
  error: string | null

  setFile: (fileName: string, fileType: FileType, encoding?: CsvEncoding) => void
  setDirty: (dirty: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useFileStore = create<FileState>((set) => ({
  fileName: null,
  fileType: null,
  encoding: null,
  isDirty: false,
  isLoading: false,
  error: null,

  setFile: (fileName, fileType, encoding?) =>
    set({ fileName, fileType, encoding: encoding ?? null, isDirty: false, error: null }),
  setDirty: (isDirty) => set({ isDirty }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      fileName: null,
      fileType: null,
      encoding: null,
      isDirty: false,
      isLoading: false,
      error: null,
    }),
}))
