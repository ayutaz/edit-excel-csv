import type { IWorkbookData } from './types'

/** 空のワークブックデータを生成する（新規作成用） */
export function createEmptyWorkbook(): Partial<IWorkbookData> {
  const sheetId = 'sheet_' + Date.now()

  return {
    id: 'workbook_' + Date.now(),
    name: 'Untitled',
    appVersion: '1.0.0',
    sheetOrder: [sheetId],
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: 'Sheet1',
        rowCount: 100,
        columnCount: 26,
        cellData: {},
        rowData: {},
        columnData: {},
        mergeData: [],
        defaultRowHeight: 24,
        defaultColumnWidth: 88,
      },
    },
  }
}
