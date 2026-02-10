import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { detectEncoding } from '@/core/encoding/detector'
import type { CsvEncoding } from '@/core/encoding/types'

export interface ReadFileResult {
  workbook: XLSX.WorkBook
  detectedEncoding?: CsvEncoding
}

/**
 * ファイルを読み込みSheetJS WorkBookとして返す
 * CSVの場合はエンコーディング自動検出結果も返す
 */
export async function readFile(
  file: File,
  encoding?: CsvEncoding,
): Promise<ReadFileResult> {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()

  if (ext === '.csv') {
    return readCsv(file, encoding)
  }

  const workbook = await readExcel(file)
  return { workbook }
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
 * エンコーディングを自動検出し、適切にデコードする
 */
async function readCsv(
  file: File,
  encoding?: CsvEncoding,
): Promise<ReadFileResult> {
  const buffer = await file.arrayBuffer()

  let detectedEncoding: CsvEncoding
  if (encoding) {
    detectedEncoding = encoding
  } else {
    const detection = detectEncoding(buffer)
    detectedEncoding = detection.encoding
  }

  // BOMをスキップしてデコード
  let decodeBuffer = buffer
  const bytes = new Uint8Array(buffer)
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    decodeBuffer = buffer.slice(3)
  }

  const decoder = new TextDecoder(detectedEncoding)
  const text = decoder.decode(decodeBuffer)

  const result = Papa.parse<string[]>(text, { header: false })
  const sheet = XLSX.utils.aoa_to_sheet(result.data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
  return { workbook, detectedEncoding }
}
