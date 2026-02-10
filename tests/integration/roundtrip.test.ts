import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { convertSheetJSToUniverData } from '@/core/univer-bridge/import-adapter'
import { convertUniverToXlsx, convertUniverToCsv } from '@/core/univer-bridge/export-adapter'

/** jsdomのBlobからArrayBufferを取得するヘルパー */
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

/** jsdomのBlobからテキストを取得するヘルパー */
async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}

describe('ラウンドトリップテスト', () => {
  describe('xlsx ラウンドトリップ', () => {
    it('セル値がインポート→エクスポート後も保持される', async () => {
      // 1. テストデータをSheetJSで作成
      const wb = XLSX.utils.book_new()
      const data = [
        ['名前', '年齢', '部署'],
        ['田中太郎', 30, '開発部'],
        ['山田花子', 25, '営業部'],
      ]
      const ws = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      // 2. import-adapterでUniverデータに変換
      const univerData = convertSheetJSToUniverData(wb)

      // 3. export-adapterでxlsx Blobに変換
      const blob = await convertUniverToXlsx(univerData)
      expect(blob).toBeInstanceOf(Blob)

      // 4. BlobをArrayBufferに変換して再度読み込み
      const buffer = await blobToArrayBuffer(blob)
      const excelWb = new ExcelJS.Workbook()
      await excelWb.xlsx.load(buffer)

      // 5. 元データと変換後データの一致検証
      const sheet = excelWb.worksheets[0]
      expect(sheet).toBeDefined()
      expect(sheet?.name).toBe('Sheet1')

      // セル値の検証
      expect(sheet?.getCell(1, 1).value).toBe('名前')
      expect(sheet?.getCell(1, 2).value).toBe('年齢')
      expect(sheet?.getCell(1, 3).value).toBe('部署')
      expect(sheet?.getCell(2, 1).value).toBe('田中太郎')
      expect(sheet?.getCell(2, 2).value).toBe(30)
      expect(sheet?.getCell(2, 3).value).toBe('開発部')
      expect(sheet?.getCell(3, 1).value).toBe('山田花子')
      expect(sheet?.getCell(3, 2).value).toBe(25)
      expect(sheet?.getCell(3, 3).value).toBe('営業部')
    })

    it('数式がラウンドトリップで保持される', async () => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([[1, 2]])
      // SheetJSの数式設定
      ws['C1'] = { t: 'n', f: 'A1+B1', v: 3 }
      ws['!ref'] = 'A1:C1'
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      const univerData = convertSheetJSToUniverData(wb)
      const blob = await convertUniverToXlsx(univerData)
      const buffer = await blobToArrayBuffer(blob)

      const excelWb = new ExcelJS.Workbook()
      await excelWb.xlsx.load(buffer)
      const sheet = excelWb.worksheets[0]

      // 数式の検証
      const cellC1 = sheet?.getCell(1, 3)
      expect(cellC1?.value).toHaveProperty('formula', 'A1+B1')
    })

    it('結合セルがラウンドトリップで保持される', async () => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([['Merged', '', ''], ['data', 'data2', 'data3']])
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }]
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      const univerData = convertSheetJSToUniverData(wb)
      const blob = await convertUniverToXlsx(univerData)
      const buffer = await blobToArrayBuffer(blob)

      const excelWb = new ExcelJS.Workbook()
      await excelWb.xlsx.load(buffer)
      const sheet = excelWb.worksheets[0]

      const cellA1 = sheet?.getCell(1, 1)
      expect(cellA1?.value).toBe('Merged')
      expect(cellA1?.isMerged).toBe(true)
    })
  })

  describe('csv ラウンドトリップ', () => {
    it('CSV値がインポート→エクスポート後も保持される', async () => {
      // 1. CSVテキストからSheetJSワークブックを作成
      const csvText = '名前,年齢,部署\n田中太郎,30,開発部\n山田花子,25,営業部'
      const parsed = Papa.parse<string[]>(csvText, { header: false })
      const ws = XLSX.utils.aoa_to_sheet(parsed.data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      // 2. import-adapter
      const univerData = convertSheetJSToUniverData(wb)

      // 3. export-adapter (CSV)
      const blob = await convertUniverToCsv(univerData)
      expect(blob).toBeInstanceOf(Blob)

      // 4. Blobからテキストを取得して再パース
      const text = await blobToText(blob)
      // BOM除去
      const cleanText = text.startsWith('\uFEFF') ? text.slice(1) : text
      const reparsed = Papa.parse<string[]>(cleanText, { header: false })

      // 5. 検証
      expect(reparsed.data.length).toBeGreaterThanOrEqual(3)
      expect(reparsed.data[0]).toEqual(['名前', '年齢', '部署'])
      expect(reparsed.data[1]).toEqual(['田中太郎', '30', '開発部'])
      expect(reparsed.data[2]).toEqual(['山田花子', '25', '営業部'])
    })

    it('UTF-8 BOMが付与される', async () => {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet([['test']])
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

      const univerData = convertSheetJSToUniverData(wb)
      const blob = await convertUniverToCsv(univerData)

      // BOMはバイト列 EF BB BF (UTF-8エンコードの\uFEFF)
      const buffer = await blobToArrayBuffer(blob)
      const bytes = new Uint8Array(buffer)
      expect(bytes[0]).toBe(0xef)
      expect(bytes[1]).toBe(0xbb)
      expect(bytes[2]).toBe(0xbf)
    })
  })
})
