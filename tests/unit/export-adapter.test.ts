import { describe, it, expect, vi } from 'vitest'
import { CellValueType, LocaleType, BooleanNumber } from '@univerjs/presets'
import { convertUniverToXlsx, convertUniverToCsv, convertUniverToPdf } from '@/core/univer-bridge/export-adapter'
import type { IWorkbookData } from '@/core/univer-bridge/types'

/** jsdom環境でBlobのテキストを読み取るヘルパー */
async function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/** BlobのバイナリからBOMの存在を確認するヘルパー */
async function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

/** テスト用のUniverスナップショットを作成 */
function createSnapshot(overrides?: Partial<IWorkbookData>): IWorkbookData {
  return {
    id: 'test-workbook',
    name: 'Test',
    appVersion: '0.1.0',
    locale: LocaleType.EN_US,
    styles: {},
    sheetOrder: ['sheet-0'],
    sheets: {
      'sheet-0': {
        id: 'sheet-0',
        name: 'Sheet1',
        tabColor: '',
        hidden: BooleanNumber.FALSE,
        rowCount: 100,
        columnCount: 26,
        zoomRatio: 1,
        scrollTop: 0,
        scrollLeft: 0,
        defaultColumnWidth: 73,
        defaultRowHeight: 19,
        cellData: {
          0: {
            0: { v: 'Hello', t: CellValueType.STRING },
            1: { v: 42, t: CellValueType.NUMBER },
          },
          1: {
            0: { v: 'World', t: CellValueType.STRING },
            1: { v: 3.14, t: CellValueType.NUMBER },
          },
        },
        rowData: {},
        columnData: {},
        mergeData: [],
        showGridlines: BooleanNumber.TRUE,
        rightToLeft: BooleanNumber.FALSE,
        freeze: { xSplit: 0, ySplit: 0, startRow: -1, startColumn: -1 },
        rowHeader: { width: 46 },
        columnHeader: { height: 20 },
      },
    },
    ...overrides,
  }
}

describe('convertUniverToXlsx', () => {
  it('有効なBlobを生成する', async () => {
    const snapshot = createSnapshot()
    const blob = await convertUniverToXlsx(snapshot)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(blob.size).toBeGreaterThan(0)
  })

  it('マージセルを含むxlsxを生成する', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.mergeData = [
      { startRow: 0, startColumn: 0, endRow: 1, endColumn: 1 },
    ]

    const blob = await convertUniverToXlsx(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('空のワークブックをエクスポートする', async () => {
    const snapshot: IWorkbookData = {
      id: 'empty',
      name: 'Empty',
      appVersion: '0.1.0',
      locale: LocaleType.EN_US,
      styles: {},
      sheetOrder: ['sheet-0'],
      sheets: {
        'sheet-0': {
          id: 'sheet-0',
          name: 'Sheet1',
          cellData: {},
          mergeData: [],
        },
      },
    }

    const blob = await convertUniverToXlsx(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('列幅が正しく変換される', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.columnData = {
      0: { w: 160 }, // 160px → 160/8 = 20 character width
      2: { w: 80 },  // 80px → 80/8 = 10 character width
    }

    const blob = await convertUniverToXlsx(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)

    // ExcelJSで再読み込みして列幅を検証
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.default.Workbook()
    const buffer = await readBlobAsArrayBuffer(blob)
    await wb.xlsx.load(buffer)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getColumn(1).width).toBe(20)  // 160 / 8
    expect(ws.getColumn(3).width).toBe(10)  // 80 / 8
  })

  it('行高が正しく変換される', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.rowData = {
      0: { h: 40 }, // 40px → 40*0.75 = 30pt
      2: { h: 20 }, // 20px → 20*0.75 = 15pt
    }

    const blob = await convertUniverToXlsx(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)

    // ExcelJSで再読み込みして行高を検証
    const ExcelJS = await import('exceljs')
    const wb = new ExcelJS.default.Workbook()
    const buffer = await readBlobAsArrayBuffer(blob)
    await wb.xlsx.load(buffer)
    const ws = wb.getWorksheet('Sheet1')!
    expect(ws.getRow(1).height).toBe(30)  // 40 * 0.75
    expect(ws.getRow(3).height).toBe(15)  // 20 * 0.75
  })

  it('数式セルを含むxlsxを生成する', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.cellData = {
      0: {
        0: { v: 1, t: CellValueType.NUMBER },
        1: { v: 2, t: CellValueType.NUMBER },
        2: { v: 3, f: '=A1+B1', t: CellValueType.NUMBER },
      },
    }

    const blob = await convertUniverToXlsx(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})

describe('convertUniverToCsv', () => {
  it('UTF-8 BOM付きのCSVを生成する', async () => {
    const snapshot = createSnapshot()
    const blob = await convertUniverToCsv(snapshot)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/csv;charset=utf-8')
  })

  it('正しいCSV内容を生成する', async () => {
    const snapshot = createSnapshot()
    const blob = await convertUniverToCsv(snapshot)

    // UTF-8 BOMの確認（バイナリレベル: EF BB BF）
    const buffer = await readBlobAsArrayBuffer(blob)
    const bytes = new Uint8Array(buffer)
    expect(bytes[0]).toBe(0xEF)
    expect(bytes[1]).toBe(0xBB)
    expect(bytes[2]).toBe(0xBF)

    // 内容の確認
    const text = await readBlobAsText(blob)
    expect(text).toContain('Hello')
    expect(text).toContain('42')
    expect(text).toContain('World')
    expect(text).toContain('3.14')
  })

  it('空のワークブックをCSVエクスポートする', async () => {
    const snapshot: IWorkbookData = {
      id: 'empty',
      name: 'Empty',
      appVersion: '0.1.0',
      locale: LocaleType.EN_US,
      styles: {},
      sheetOrder: ['sheet-0'],
      sheets: {
        'sheet-0': {
          id: 'sheet-0',
          name: 'Sheet1',
          cellData: {},
        },
      },
    }

    const blob = await convertUniverToCsv(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/csv;charset=utf-8')
  })

  it('指定したシートIDでCSVを生成する', async () => {
    const snapshot: IWorkbookData = {
      id: 'multi',
      name: 'Multi',
      appVersion: '0.1.0',
      locale: LocaleType.EN_US,
      styles: {},
      sheetOrder: ['sheet-0', 'sheet-1'],
      sheets: {
        'sheet-0': {
          id: 'sheet-0',
          name: 'Sheet1',
          cellData: {
            0: { 0: { v: 'Sheet1Data', t: CellValueType.STRING } },
          },
        },
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet2',
          cellData: {
            0: { 0: { v: 'Sheet2Data', t: CellValueType.STRING } },
          },
        },
      },
    }

    const blob = await convertUniverToCsv(snapshot, 'sheet-1')
    expect(blob).toBeInstanceOf(Blob)
  })

  it('指定シートIDのCSV内容が正しい', async () => {
    const snapshot: IWorkbookData = {
      id: 'multi',
      name: 'Multi',
      appVersion: '0.1.0',
      locale: LocaleType.EN_US,
      styles: {},
      sheetOrder: ['sheet-0', 'sheet-1'],
      sheets: {
        'sheet-0': {
          id: 'sheet-0',
          name: 'Sheet1',
          cellData: {
            0: { 0: { v: 'Sheet1Data', t: CellValueType.STRING } },
          },
        },
        'sheet-1': {
          id: 'sheet-1',
          name: 'Sheet2',
          cellData: {
            0: { 0: { v: 'Sheet2Data', t: CellValueType.STRING } },
          },
        },
      },
    }

    const blob = await convertUniverToCsv(snapshot, 'sheet-1')
    const text = await readBlobAsText(blob)
    expect(text).toContain('Sheet2Data')
    expect(text).not.toContain('Sheet1Data')
  })

  it('Shift_JISエンコーディングでCSVを生成する', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.cellData = {
      0: {
        0: { v: '名前', t: CellValueType.STRING },
        1: { v: '年齢', t: CellValueType.STRING },
      },
      1: {
        0: { v: '田中', t: CellValueType.STRING },
        1: { v: 30, t: CellValueType.NUMBER },
      },
    }

    const blob = await convertUniverToCsv(snapshot, undefined, 'shift_jis')

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/csv;charset=shift_jis')

    // Shift_JISとしてデコードして内容を確認
    const buffer = await readBlobAsArrayBuffer(blob)
    const decoder = new TextDecoder('shift_jis')
    const text = decoder.decode(buffer)
    expect(text).toContain('名前')
    expect(text).toContain('田中')
    expect(text).toContain('30')
  })

  it('EUC-JPエンコーディングでCSVを生成する', async () => {
    const snapshot = createSnapshot()
    snapshot.sheets['sheet-0']!.cellData = {
      0: {
        0: { v: '名前', t: CellValueType.STRING },
      },
      1: {
        0: { v: '佐藤', t: CellValueType.STRING },
      },
    }

    const blob = await convertUniverToCsv(snapshot, undefined, 'euc-jp')

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/csv;charset=euc-jp')

    const buffer = await readBlobAsArrayBuffer(blob)
    const decoder = new TextDecoder('euc-jp')
    const text = decoder.decode(buffer)
    expect(text).toContain('名前')
    expect(text).toContain('佐藤')
  })
})

// font-loaderをモック: jsPDFの組み込みフォントをそのまま使う（ダミーフォント登録を回避）
vi.mock('@/core/pdf/font-loader', () => ({
  loadJapaneseFont: vi.fn().mockResolvedValue(undefined),
  getJapaneseFontName: vi.fn().mockReturnValue('helvetica'),
}))

describe('convertUniverToPdf', () => {
  it('有効なPDF Blobを生成する', async () => {
    const snapshot = createSnapshot()
    const blob = await convertUniverToPdf(snapshot)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('空のワークブックでもエラーなくPDFを生成する', async () => {
    const snapshot: IWorkbookData = {
      id: 'empty',
      name: 'Empty',
      appVersion: '0.1.0',
      locale: LocaleType.EN_US,
      styles: {},
      sheetOrder: ['sheet-0'],
      sheets: {
        'sheet-0': {
          id: 'sheet-0',
          name: 'Sheet1',
          cellData: {},
          mergeData: [],
        },
      },
    }

    const blob = await convertUniverToPdf(snapshot)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })
})
