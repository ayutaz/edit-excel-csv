import * as XLSX from 'xlsx'
import { CellValueType, LocaleType, BooleanNumber } from '@univerjs/presets'
import type { IWorkbookData, ICellData } from './types'

const DEFAULT_ROW_COUNT = 1000
const DEFAULT_COLUMN_COUNT = 26

/**
 * SheetJS WorkBookをUniverのIWorkbookDataに変換する
 */
export function convertSheetJSToUniverData(workbook: XLSX.WorkBook): IWorkbookData {
  const sheetOrder: string[] = []
  const sheets: IWorkbookData['sheets'] = {}

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) continue

    const sheetId = `sheet-${sheetOrder.length}`
    sheetOrder.push(sheetId)

    const ref = worksheet['!ref']
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }

    const dataRowCount = range.e.r + 1
    const dataColCount = range.e.c + 1
    const rowCount = Math.max(DEFAULT_ROW_COUNT, dataRowCount)
    const columnCount = Math.max(DEFAULT_COLUMN_COUNT, dataColCount)

    // セルデータの変換
    const cellData: Record<number, Record<number, ICellData>> = {}
    for (const cellRef of Object.keys(worksheet)) {
      if (cellRef.startsWith('!')) continue
      const { r, c } = XLSX.utils.decode_cell(cellRef)
      const cell = worksheet[cellRef] as XLSX.CellObject

      const univerCell: ICellData = {}

      // 値の設定
      if (cell.v !== undefined && cell.v !== null) {
        univerCell.v = cell.v as string | number | boolean
      }

      // 型の設定
      univerCell.t = mapCellType(cell.t)

      // 数式の保持
      if (cell.f) {
        univerCell.f = `=${cell.f}`
      }

      if (!cellData[r]) {
        cellData[r] = {}
      }
      cellData[r][c] = univerCell
    }

    // マージセルの変換
    const mergeData = (worksheet['!merges'] ?? []).map((merge) => ({
      startRow: merge.s.r,
      startColumn: merge.s.c,
      endRow: merge.e.r,
      endColumn: merge.e.c,
    }))

    // カラム幅の変換
    const columnData: Record<number, { w?: number }> = {}
    const cols = worksheet['!cols']
    if (cols) {
      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        if (col?.wpx) {
          columnData[i] = { w: col.wpx }
        } else if (col?.wch) {
          // 文字幅をピクセルに概算変換 (1文字 ≈ 8px)
          columnData[i] = { w: col.wch * 8 }
        }
      }
    }

    // 行高の変換
    const rowData: Record<number, { h?: number }> = {}
    const rows = worksheet['!rows']
    if (rows) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row?.hpx) {
          rowData[i] = { h: row.hpx }
        } else if (row?.hpt) {
          // ポイントをピクセルに変換 (1pt ≈ 1.333px)
          rowData[i] = { h: Math.round(row.hpt * 1.333) }
        }
      }
    }

    sheets[sheetId] = {
      id: sheetId,
      name: sheetName,
      tabColor: '',
      hidden: BooleanNumber.FALSE,
      rowCount,
      columnCount,
      zoomRatio: 1,
      scrollTop: 0,
      scrollLeft: 0,
      defaultColumnWidth: 73,
      defaultRowHeight: 19,
      cellData,
      rowData,
      columnData,
      mergeData,
      showGridlines: BooleanNumber.TRUE,
      rightToLeft: BooleanNumber.FALSE,
      freeze: {
        xSplit: 0,
        ySplit: 0,
        startRow: -1,
        startColumn: -1,
      },
      rowHeader: { width: 46 },
      columnHeader: { height: 20 },
    }
  }

  // 空のワークブックの場合、デフォルトシートを作成
  if (sheetOrder.length === 0) {
    const sheetId = 'sheet-0'
    sheetOrder.push(sheetId)
    sheets[sheetId] = {
      id: sheetId,
      name: 'Sheet1',
      tabColor: '',
      hidden: BooleanNumber.FALSE,
      rowCount: DEFAULT_ROW_COUNT,
      columnCount: DEFAULT_COLUMN_COUNT,
      zoomRatio: 1,
      scrollTop: 0,
      scrollLeft: 0,
      defaultColumnWidth: 73,
      defaultRowHeight: 19,
      cellData: {},
      rowData: {},
      columnData: {},
      mergeData: [],
      showGridlines: BooleanNumber.TRUE,
      rightToLeft: BooleanNumber.FALSE,
      freeze: {
        xSplit: 0,
        ySplit: 0,
        startRow: -1,
        startColumn: -1,
      },
      rowHeader: { width: 46 },
      columnHeader: { height: 20 },
    }
  }

  return {
    id: 'workbook-01',
    name: 'Workbook',
    appVersion: '0.1.0',
    locale: LocaleType.EN_US,
    styles: {},
    sheetOrder,
    sheets,
  }
}

/** SheetJSのセル型をUniverのCellValueTypeにマッピング */
function mapCellType(type: XLSX.CellObject['t']): CellValueType {
  switch (type) {
    case 'n':
      return CellValueType.NUMBER
    case 's':
      return CellValueType.STRING
    case 'b':
      return CellValueType.BOOLEAN
    case 'e': // エラー → 文字列として保存
      return CellValueType.STRING
    case 'd': // 日付 → 文字列として保存
      return CellValueType.STRING
    default:
      return CellValueType.STRING
  }
}
