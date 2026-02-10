export type FileType = 'xlsx' | 'xls' | 'csv'

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'pdf'
  fileName: string
  /** CSV export時にインジェクション検出を行うか */
  detectInjection?: boolean
}

/** Univerの内部型を再exportして一元管理 */
export type { IWorkbookData, ICellData } from '@univerjs/presets'
