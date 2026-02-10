import { describe, it, expect } from 'vitest'
import { readFile } from '@/core/file-io/reader'

/** FileReaderでBlobをArrayBufferに変換するヘルパー */
function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

/** FileReaderでBlobをテキストに変換するヘルパー */
function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

/**
 * jsdom環境ではFile.text()やFile.arrayBuffer()が未実装のため、
 * FileReaderベースのポリフィルを付与したFileオブジェクトを作成する
 */
function createMockFile(
  name: string,
  content: ArrayBuffer | string | Uint8Array,
  type = '',
): File {
  const blob =
    typeof content === 'string'
      ? new Blob([content], { type: type || 'text/csv' })
      : new Blob([content], { type })
  const file = new File([blob], name, { type: blob.type })

  // jsdomではtext()/arrayBuffer()が未実装のためFileReaderベースでポリフィル
  if (!file.text) {
    file.text = () => blobToText(file)
  }
  if (!file.arrayBuffer) {
    file.arrayBuffer = () => blobToArrayBuffer(file)
  }

  return file
}

describe('readFile', () => {
  it('CSVファイルを読み込みWorkBookを返す', async () => {
    const csvContent = 'Name,Age\nAlice,30\nBob,25'
    const file = createMockFile('test.csv', csvContent)

    const result = await readFile(file)

    expect(result.workbook).toBeDefined()
    expect(result.workbook.SheetNames).toHaveLength(1)
    expect(result.workbook.SheetNames[0]).toBe('Sheet1')
    expect(result.detectedEncoding).toBe('utf-8')

    const sheet = result.workbook.Sheets['Sheet1']
    expect(sheet).toBeDefined()
  })

  it('CSVの値が正しくパースされる', async () => {
    const csvContent = 'A,B\n1,2\n3,4'
    const file = createMockFile('data.csv', csvContent)

    const result = await readFile(file)
    const sheet = result.workbook.Sheets['Sheet1']!

    const XLSX = await import('xlsx')
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    expect(data[0]).toEqual(['A', 'B'])
    expect(data[1]).toEqual(['1', '2'])
    expect(data[2]).toEqual(['3', '4'])
  })

  it('xlsxファイルを読み込みWorkBookを返す', async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
      ['Header1', 'Header2'],
      ['Data1', 'Data2'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'TestSheet')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    const file = createMockFile(
      'test.xlsx',
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )

    const result = await readFile(file)

    expect(result.workbook).toBeDefined()
    expect(result.workbook.SheetNames).toContain('TestSheet')
    expect(result.detectedEncoding).toBeUndefined()
    const sheet = result.workbook.Sheets['TestSheet']!
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    expect(data[0]).toEqual(['Header1', 'Header2'])
    expect(data[1]).toEqual(['Data1', 'Data2'])
  })

  it('xlsファイルもExcelとして読み込む', async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['Test']])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })

    const file = createMockFile('legacy.xls', buffer)

    const result = await readFile(file)
    expect(result.workbook).toBeDefined()
    expect(result.workbook.SheetNames).toHaveLength(1)
  })

  it('空のCSVでもWorkBookを返す', async () => {
    const file = createMockFile('empty.csv', '')

    const result = await readFile(file)

    expect(result.workbook).toBeDefined()
    expect(result.workbook.SheetNames).toHaveLength(1)
  })

  it('拡張子で読み込みパスが分岐する', async () => {
    // .csvはPapaParse経由、.xlsxはSheetJS直接読み込み
    // 同じデータでも拡張子によって処理パスが異なることを確認
    const csvFile = createMockFile('test.csv', 'A,B\n1,2')
    const csvResult = await readFile(csvFile)
    // CSV読み込みはSheet1固定
    expect(csvResult.workbook.SheetNames[0]).toBe('Sheet1')

    const XLSX = await import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['A', 'B'], [1, 2]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CustomName')
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const xlsxFile = createMockFile('test.xlsx', buffer)
    const xlsxResult = await readFile(xlsxFile)
    // Excel読み込みは元のシート名を保持
    expect(xlsxResult.workbook.SheetNames[0]).toBe('CustomName')
  })

  it('エンコーディング手動指定でCSVを読み込む', async () => {
    // encoding-japaneseで Shift_JIS バイト列を生成
    const Encoding = await import('encoding-japanese')
    const text = '名前,年齢\n田中太郎,30'
    const unicodeArray = Encoding.stringToCode(text)
    const sjisBytes = new Uint8Array(
      Encoding.convert(unicodeArray, { to: 'SJIS', from: 'UNICODE' }),
    )

    const file = createMockFile('sjis.csv', sjisBytes, 'text/csv')

    const result = await readFile(file, 'shift_jis')
    expect(result.detectedEncoding).toBe('shift_jis')

    const XLSX = await import('xlsx')
    const data = XLSX.utils.sheet_to_json<string[]>(
      result.workbook.Sheets['Sheet1']!,
      { header: 1 },
    )
    expect(data[0]).toEqual(['名前', '年齢'])
    expect(data[1]).toEqual(['田中太郎', '30'])
  })

  it('Shift_JIS CSVの自動検出で正しく読み込む', async () => {
    const Encoding = await import('encoding-japanese')
    const text = '名前,年齢\n田中太郎,30\n鈴木花子,25'
    const unicodeArray = Encoding.stringToCode(text)
    const sjisBytes = new Uint8Array(
      Encoding.convert(unicodeArray, { to: 'SJIS', from: 'UNICODE' }),
    )

    const file = createMockFile('auto_sjis.csv', sjisBytes, 'text/csv')

    const result = await readFile(file)
    expect(result.detectedEncoding).toBe('shift_jis')

    const XLSX = await import('xlsx')
    const data = XLSX.utils.sheet_to_json<string[]>(
      result.workbook.Sheets['Sheet1']!,
      { header: 1 },
    )
    expect(data[0]).toEqual(['名前', '年齢'])
  })
})
