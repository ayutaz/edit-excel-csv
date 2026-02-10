import { createUniver, defaultTheme, LocaleType } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import '@univerjs/preset-sheets-core/lib/index.css'
import sheetsEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import type { IWorkbookData } from './types'
import type { FUniver, IDisposable } from '@univerjs/presets'

/** Univerインスタンスのラッパー */
export interface UniverInstance {
  /** ワークブックデータをロードしてUniverに表示 */
  loadWorkbook(data: Partial<IWorkbookData>): void
  /** 現在のスナップショットを取得 */
  getSnapshot(): IWorkbookData | null
  /** リソースを解放 */
  dispose(): void
  /** セル編集を検知してコールバックを呼び出す（ダーティ追跡用） */
  onCellEdited(callback: () => void): IDisposable
  /** Facade API への直接アクセス */
  readonly univerAPI: FUniver
}

/**
 * Univerインスタンスを作成する
 * @param containerId マウント先のDOM要素ID
 */
export function createUniverInstance(containerId: string): UniverInstance {
  const { univer, univerAPI } = createUniver({
    locale: LocaleType.EN_US,
    locales: { [LocaleType.EN_US]: sheetsEnUS },
    theme: defaultTheme,
    presets: [
      UniverSheetsCorePreset({ container: containerId }),
    ],
  })

  const instance: UniverInstance = {
    loadWorkbook(data: Partial<IWorkbookData>) {
      univerAPI.createWorkbook(data)
    },

    getSnapshot(): IWorkbookData | null {
      const workbook = univerAPI.getActiveWorkbook()
      if (!workbook) return null
      return workbook.save()
    },

    dispose() {
      univer.dispose()
    },

    onCellEdited(callback: () => void): IDisposable {
      // コマンド実行を監視してセル編集を検知
      return univerAPI.onCommandExecuted((commandInfo) => {
        const { id } = commandInfo
        // セル値変更に関連するコマンドを検出
        if (
          id.includes('set-range-values') ||
          id.includes('set-cell') ||
          id.includes('delete-range') ||
          id.includes('insert-range') ||
          id.includes('move-range') ||
          id.includes('clear-selection') ||
          id.includes('paste')
        ) {
          callback()
        }
      })
    },

    get univerAPI() {
      return univerAPI
    },
  }

  return instance
}
