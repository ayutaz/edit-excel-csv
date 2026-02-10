import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { CellValueType } from '@univerjs/presets'
import { convertSheetJSToUniverData } from '@/core/univer-bridge/import-adapter'

/** ヘルパー: 指定のセルデータを持つSheetJSワークブックを作成 */
function createWorkbook(
  data: (string | number | boolean | null)[][],
  sheetName = 'Sheet1',
): XLSX.WorkBook {
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return wb
}

describe('convertSheetJSToUniverData', () => {
  it('基本的なセル値（文字列、数値、真偽値）を変換する', () => {
    const wb = createWorkbook([
      ['Hello', 42, true],
      ['World', 3.14, false],
    ])

    const result = convertSheetJSToUniverData(wb)

    expect(result.sheetOrder).toHaveLength(1)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    // 文字列セル
    expect(sheet.cellData?.[0]?.[0]?.v).toBe('Hello')
    expect(sheet.cellData?.[0]?.[0]?.t).toBe(CellValueType.STRING)

    // 数値セル
    expect(sheet.cellData?.[0]?.[1]?.v).toBe(42)
    expect(sheet.cellData?.[0]?.[1]?.t).toBe(CellValueType.NUMBER)

    // 真偽値セル
    expect(sheet.cellData?.[0]?.[2]?.v).toBe(true)
    expect(sheet.cellData?.[0]?.[2]?.t).toBe(CellValueType.BOOLEAN)

    // 2行目
    expect(sheet.cellData?.[1]?.[0]?.v).toBe('World')
    expect(sheet.cellData?.[1]?.[1]?.v).toBe(3.14)
    expect(sheet.cellData?.[1]?.[2]?.v).toBe(false)
  })

  it('数式を保持する', () => {
    const ws = XLSX.utils.aoa_to_sheet([[1, 2]])
    // 数式セルを手動追加
    ws['C1'] = { t: 'n', v: 3, f: 'A1+B1' }
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    // !refを更新
    ws['!ref'] = 'A1:C1'

    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.cellData?.[0]?.[2]?.f).toBe('=A1+B1')
    expect(sheet.cellData?.[0]?.[2]?.v).toBe(3)
  })

  it('マージセルを変換する', () => {
    const ws = XLSX.utils.aoa_to_sheet([['Merged', '', ''], ['', '', '']])
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.mergeData).toHaveLength(1)
    expect(sheet.mergeData?.[0]).toEqual({
      startRow: 0,
      startColumn: 0,
      endRow: 1,
      endColumn: 1,
    })
  })

  it('カラム幅を変換する', () => {
    const ws = XLSX.utils.aoa_to_sheet([['A', 'B']])
    ws['!cols'] = [
      { wpx: 120 },
      { wch: 15 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.columnData?.[0]?.w).toBe(120)
    expect(sheet.columnData?.[1]?.w).toBe(120) // 15 * 8 = 120
  })

  it('行高を変換する', () => {
    const ws = XLSX.utils.aoa_to_sheet([['A'], ['B']])
    ws['!rows'] = [
      { hpx: 30 },
      { hpt: 15 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.rowData?.[0]?.h).toBe(30)
    expect(sheet.rowData?.[1]?.h).toBe(Math.round(15 * 1.333))
  })

  it('空のワークシートを処理する', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([])
    XLSX.utils.book_append_sheet(wb, ws, 'Empty')

    const result = convertSheetJSToUniverData(wb)

    expect(result.sheetOrder).toHaveLength(1)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!
    expect(sheet.name).toBe('Empty')
  })

  it('デフォルトの行数・列数が設定される', () => {
    const wb = createWorkbook([['A']])
    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.rowCount).toBeGreaterThanOrEqual(1000)
    expect(sheet.columnCount).toBeGreaterThanOrEqual(26)
  })

  it('データが大きい場合、行数・列数を拡大する', () => {
    // 1001行 x 30列のデータを作成
    const data: (string | null)[][] = []
    for (let r = 0; r <= 1000; r++) {
      const row: string[] = []
      for (let c = 0; c < 30; c++) {
        row.push(`R${r}C${c}`)
      }
      data.push(row)
    }
    const wb = createWorkbook(data)
    const result = convertSheetJSToUniverData(wb)
    const sheetId = result.sheetOrder[0]!
    const sheet = result.sheets[sheetId]!

    expect(sheet.rowCount).toBeGreaterThanOrEqual(1001)
    expect(sheet.columnCount).toBeGreaterThanOrEqual(30)
  })

  it('複数シートを変換する', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['A']]), 'Sheet1')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['B']]), 'Sheet2')

    const result = convertSheetJSToUniverData(wb)
    expect(result.sheetOrder).toHaveLength(2)

    const sheet1 = result.sheets[result.sheetOrder[0]!]!
    const sheet2 = result.sheets[result.sheetOrder[1]!]!
    expect(sheet1.name).toBe('Sheet1')
    expect(sheet2.name).toBe('Sheet2')
  })

  it('IWorkbookDataの必須フィールドが設定される', () => {
    const wb = createWorkbook([['Test']])
    const result = convertSheetJSToUniverData(wb)

    expect(result.id).toBeDefined()
    expect(result.name).toBeDefined()
    expect(result.appVersion).toBeDefined()
    expect(result.locale).toBeDefined()
    expect(result.styles).toBeDefined()
    expect(result.sheetOrder).toBeDefined()
    expect(result.sheets).toBeDefined()
  })
})
