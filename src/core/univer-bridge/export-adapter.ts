import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import { jsPDF } from 'jspdf'
import autoTable, { type CellDef } from 'jspdf-autotable'
import { detectCsvInjection } from '@/core/security/sanitizer'
import { encodeCsvString } from '@/core/encoding/encoder'
import type { CsvEncoding } from '@/core/encoding/types'
import type { IWorkbookData, ICellData } from './types'

/**
 * UniverスナップショットをExcelファイル(Blob)に変換する
 */
export async function convertUniverToXlsx(snapshot: IWorkbookData): Promise<Blob> {
  const wb = new ExcelJS.Workbook()

  for (const sheetId of snapshot.sheetOrder) {
    const sheetData = snapshot.sheets[sheetId]
    if (!sheetData) continue

    const ws = wb.addWorksheet(sheetData.name ?? 'Sheet')

    // カラム幅の設定
    const columnData = sheetData.columnData
    if (columnData) {
      const colCount = sheetData.columnCount ?? 26
      for (let c = 0; c < colCount; c++) {
        const col = columnData[c]
        if (col?.w) {
          // ExcelJSのwidth はcharacter widthに近い単位 (1文字 ≈ 8px)
          const excelCol = ws.getColumn(c + 1) // ExcelJS は 1-indexed
          excelCol.width = col.w / 8
        }
      }
    }

    // 行高の設定
    const rowData = sheetData.rowData
    if (rowData) {
      for (const rowIdx of Object.keys(rowData)) {
        const row = rowData[Number(rowIdx)]
        if (row?.h) {
          // ExcelJSのheightはポイント (1px ≈ 0.75pt)
          ws.getRow(Number(rowIdx) + 1).height = row.h * 0.75
        }
      }
    }

    // セルデータの設定
    const cellData = sheetData.cellData
    if (cellData) {
      for (const rowIdx of Object.keys(cellData)) {
        const row = cellData[Number(rowIdx)]
        if (!row) continue
        for (const colIdx of Object.keys(row)) {
          const cell = row[Number(colIdx)] as ICellData | undefined
          if (!cell) continue

          // ExcelJSは1-indexed
          const excelCell = ws.getCell(Number(rowIdx) + 1, Number(colIdx) + 1)

          if (cell.f) {
            // 数式の設定（先頭の = を除去）
            const formula = cell.f.startsWith('=') ? cell.f.slice(1) : cell.f
            excelCell.value = { formula, result: cell.v ?? undefined } as ExcelJS.CellFormulaValue
          } else if (cell.v !== undefined && cell.v !== null) {
            excelCell.value = cell.v
          }
        }
      }
    }

    // マージセルの設定
    const mergeData = sheetData.mergeData
    if (mergeData) {
      for (const merge of mergeData) {
        // ExcelJSは1-indexed
        ws.mergeCells(
          merge.startRow + 1,
          merge.startColumn + 1,
          merge.endRow + 1,
          merge.endColumn + 1,
        )
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/**
 * UniverスナップショットをCSVファイル(Blob)に変換する
 * @param snapshot ワークブックスナップショット
 * @param sheetId 変換対象のシートID（省略時はアクティブシート = sheetOrder[0]）
 * @param encoding 出力エンコーディング（デフォルト: utf-8）
 */
export async function convertUniverToCsv(
  snapshot: IWorkbookData,
  sheetId?: string,
  encoding: CsvEncoding = 'utf-8',
): Promise<Blob> {
  const targetSheetId = sheetId ?? snapshot.sheetOrder[0]
  const sheetData = targetSheetId ? snapshot.sheets[targetSheetId] : undefined

  if (!sheetData?.cellData) {
    // 空のCSVを生成
    const csv = Papa.unparse([])
    const encoded = await encodeCsvString(csv, encoding)
    return new Blob([encoded as BlobPart], { type: csvMimeType(encoding) })
  }

  const cellData = sheetData.cellData

  // データの範囲を検出
  let maxRow = 0
  let maxCol = 0
  for (const rowIdx of Object.keys(cellData)) {
    const row = cellData[Number(rowIdx)]
    if (!row) continue
    const rn = Number(rowIdx)
    if (rn > maxRow) maxRow = rn
    for (const colIdx of Object.keys(row)) {
      const cn = Number(colIdx)
      if (cn > maxCol) maxCol = cn
    }
  }

  // string[][]を構築
  const data: string[][] = []
  for (let r = 0; r <= maxRow; r++) {
    const rowArr: string[] = []
    for (let c = 0; c <= maxCol; c++) {
      const cell = cellData[r]?.[c] as ICellData | undefined
      if (cell?.v !== undefined && cell?.v !== null) {
        rowArr.push(String(cell.v))
      } else {
        rowArr.push('')
      }
    }
    data.push(rowArr)
  }

  // CSVインジェクション検出（MVP: console.warnのみ）
  detectCsvInjection(data)

  const csv = Papa.unparse(data)
  const encoded = await encodeCsvString(csv, encoding)
  return new Blob([encoded as BlobPart], { type: csvMimeType(encoding) })
}

function csvMimeType(encoding: CsvEncoding): string {
  const charset = encoding === 'shift_jis' ? 'shift_jis' : encoding === 'euc-jp' ? 'euc-jp' : 'utf-8'
  return `text/csv;charset=${charset}`
}

/**
 * UniverスナップショットをPDFファイル(Blob)に変換する
 * A4横向き、各シートを別ページに出力
 *
 * 注意: jsPDFのデフォルトフォント(Helvetica)は日本語非対応のため、
 * 日本語テキストは正しく表示されない場合があります。
 */
export function convertUniverToPdf(snapshot: IWorkbookData): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10

  let isFirstSheet = true

  for (const sheetId of snapshot.sheetOrder) {
    const sheetData = snapshot.sheets[sheetId]
    if (!sheetData) continue

    if (!isFirstSheet) {
      doc.addPage('a4', 'landscape')
    }
    isFirstSheet = false

    const sheetName = sheetData.name ?? 'Sheet'

    // シートタイトルを描画
    doc.setFontSize(14)
    doc.text(sheetName, margin, margin + 5)

    const cellData = sheetData.cellData
    if (!cellData) {
      // 空シート: シート名のみ表示
      doc.setFontSize(10)
      doc.text('(empty sheet)', margin, margin + 15)
      continue
    }

    // データ範囲を検出
    let maxRow = 0
    let maxCol = 0
    for (const rowIdx of Object.keys(cellData)) {
      const row = cellData[Number(rowIdx)]
      if (!row) continue
      const rn = Number(rowIdx)
      if (rn > maxRow) maxRow = rn
      for (const colIdx of Object.keys(row)) {
        const cn = Number(colIdx)
        if (cn > maxCol) maxCol = cn
      }
    }

    // セル結合マップを構築
    const mergeMap = new Map<string, { rowSpan: number; colSpan: number }>()
    const mergedCells = new Set<string>()
    if (sheetData.mergeData) {
      for (const merge of sheetData.mergeData) {
        const rowSpan = merge.endRow - merge.startRow + 1
        const colSpan = merge.endColumn - merge.startColumn + 1
        mergeMap.set(`${merge.startRow},${merge.startColumn}`, { rowSpan, colSpan })
        // 結合の子セル（左上以外）をマーク
        for (let r = merge.startRow; r <= merge.endRow; r++) {
          for (let c = merge.startColumn; c <= merge.endColumn; c++) {
            if (r !== merge.startRow || c !== merge.startColumn) {
              mergedCells.add(`${r},${c}`)
            }
          }
        }
      }
    }

    // body配列を構築（CellDef[][]）
    const body: CellDef[][] = []
    for (let r = 0; r <= maxRow; r++) {
      const rowArr: CellDef[] = []
      for (let c = 0; c <= maxCol; c++) {
        const key = `${r},${c}`
        // 結合の子セルはスキップ（autotableが自動で埋める）
        if (mergedCells.has(key)) continue

        const cell = cellData[r]?.[c] as ICellData | undefined
        const content = cell?.v !== undefined && cell?.v !== null ? String(cell.v) : ''

        const cellDef: CellDef = { content }
        const merge = mergeMap.get(key)
        if (merge) {
          if (merge.rowSpan > 1) cellDef.rowSpan = merge.rowSpan
          if (merge.colSpan > 1) cellDef.colSpan = merge.colSpan
        }
        rowArr.push(cellDef)
      }
      body.push(rowArr)
    }

    // カラム幅を比例配分で計算
    const colCount = maxCol + 1
    const columnData = sheetData.columnData
    const rawWidths: number[] = []
    let totalRaw = 0
    for (let c = 0; c < colCount; c++) {
      const w = columnData?.[c]?.w ?? 80 // デフォルト幅80px
      rawWidths.push(w)
      totalRaw += w
    }

    const availableWidth = pageWidth - margin * 2
    const columnStyles: Record<number, { cellWidth: number }> = {}
    for (let c = 0; c < colCount; c++) {
      columnStyles[c] = { cellWidth: ((rawWidths[c] ?? 80) / totalRaw) * availableWidth }
    }

    autoTable(doc, {
      body,
      startY: margin + 10,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1.5,
        overflow: 'linebreak',
      },
      columnStyles,
    })
  }

  // 空のワークブック対応
  if (isFirstSheet) {
    doc.setFontSize(10)
    doc.text('(empty workbook)', margin, margin + 5)
  }

  return doc.output('blob')
}
