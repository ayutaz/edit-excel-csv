import * as XLSX from 'xlsx'
import Papa from 'papaparse'

/**
 * ファイルを読み込みSheetJS WorkBookとして返す
 */
export async function readFile(file: File): Promise<XLSX.WorkBook> {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()

  if (ext === '.csv') {
    return readCsv(file)
  }

  return readExcel(file)
}

/**
 * Excel (.xlsx / .xls) ファイルの読み込み
 */
async function readExcel(file: File): Promise<XLSX.WorkBook> {
  let buffer: ArrayBuffer | null = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  // GCを促すため参照を解放
  buffer = null
  return workbook
}

/**
 * CSVファイルの読み込み（PapaParseでパース後、SheetJS WorkBookに変換）
 */
async function readCsv(file: File): Promise<XLSX.WorkBook> {
  const text = await file.text()
  const result = Papa.parse<string[]>(text, { header: false })
  const sheet = XLSX.utils.aoa_to_sheet(result.data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return workbook
}
