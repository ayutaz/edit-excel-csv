import { useRef, useEffect, useCallback, useState } from 'react'
import {
  createUniverInstance,
  type UniverInstance,
} from '@/core/univer-bridge/setup'
import type { IWorkbookData } from '@/core/univer-bridge/types'

export function useUniver(containerId: string, isReady: boolean = true) {
  const instanceRef = useRef<UniverInstance | null>(null)
  const pendingDataRef = useRef<Partial<IWorkbookData> | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize on mount, dispose on unmount
  // requestAnimationFrameでFlexboxレイアウト計算完了後にUniverを初期化する
  // （レイアウト未完了時はコンテナが0pxとなり、列幅計算で負の値になるため）
  useEffect(() => {
    if (!isReady) return

    // Univerの内部数式エディタが初期化時にコンテナのレイアウト完了前に
    // 列幅を計算するためエラーログが出る。自動修正されるため抑制する。
    const originalError = console.error
    console.error = (...args: unknown[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('column width is less than 0')
      ) {
        return
      }
      originalError.apply(console, args)
    }

    const rafId = requestAnimationFrame(() => {
      const container = document.getElementById(containerId)
      if (!container) return

      try {
        instanceRef.current = createUniverInstance(containerId)
        setInitError(null)

        // インスタンス未初期化時にloadWorkbookされたデータを適用
        if (pendingDataRef.current) {
          instanceRef.current.loadWorkbook(pendingDataRef.current)
          pendingDataRef.current = null
        }

        setIsInitialized(true)
      } catch (err) {
        console.error('Univer初期化エラー:', err)
        setInitError(
          err instanceof Error ? err.message : 'Univerの初期化に失敗しました',
        )
        instanceRef.current = null
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      console.error = originalError
      try {
        instanceRef.current?.dispose()
      } catch {
        // dispose時のエラーは無視
      }
      instanceRef.current = null
      pendingDataRef.current = null  // メモリリーク防止
      setIsInitialized(false)
    }
  }, [containerId, isReady])

  const loadWorkbook = useCallback((data: Partial<IWorkbookData>) => {
    if (instanceRef.current) {
      instanceRef.current.loadWorkbook(data)
      pendingDataRef.current = null
    } else {
      pendingDataRef.current = data
    }
  }, [])

  const getSnapshot = useCallback((): IWorkbookData | null => {
    return instanceRef.current?.getSnapshot() ?? null
  }, [])

  const onCellEdited = useCallback((callback: () => void) => {
    return instanceRef.current?.onCellEdited(callback) ?? (() => {})
  }, [])

  return { loadWorkbook, getSnapshot, onCellEdited, initError, isInitialized }
}
