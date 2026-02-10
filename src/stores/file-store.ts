import { create } from 'zustand'
import type { FileType } from '@/core/univer-bridge/types'

interface FileState {
  fileName: string | null
  fileType: FileType | null
  isDirty: boolean
  isLoading: boolean
  error: string | null

  setFile: (fileName: string, fileType: FileType) => void
  setDirty: (dirty: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useFileStore = create<FileState>((set) => ({
  fileName: null,
  fileType: null,
  isDirty: false,
  isLoading: false,
  error: null,

  setFile: (fileName, fileType) =>
    set({ fileName, fileType, isDirty: false, error: null }),
  setDirty: (isDirty) => set({ isDirty }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      fileName: null,
      fileType: null,
      isDirty: false,
      isLoading: false,
      error: null,
    }),
}))
