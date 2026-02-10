export interface SanitizationResult {
  hasDangerousCells: boolean
  dangerousCells: Array<{ row: number; col: number; value: string }>
}

// CSVインジェクションの危険なプレフィックス文字
const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r', '\n']

/**
 * 2次元文字列配列からCSVインジェクションの可能性があるセルを検出する
 * MVP段階ではconsole.warnで警告を出力
 */
export function detectCsvInjection(data: string[][]): SanitizationResult {
  const dangerousCells: SanitizationResult['dangerousCells'] = []

  for (let row = 0; row < data.length; row++) {
    const rowData = data[row]
    if (!rowData) continue
    for (let col = 0; col < rowData.length; col++) {
      const value = rowData[col]
      if (typeof value !== 'string' || value.length === 0) continue
      if (DANGEROUS_PREFIXES.some((prefix) => value.startsWith(prefix))) {
        dangerousCells.push({ row, col, value })
      }
    }
  }

  if (dangerousCells.length > 0) {
    console.warn(
      `CSVインジェクションの可能性: ${dangerousCells.length}件の危険なセルを検出しました`,
      dangerousCells,
    )
  }

  return {
    hasDangerousCells: dangerousCells.length > 0,
    dangerousCells,
  }
}
