import type { CsvEncoding } from './types'

/**
 * CSV文字列を指定エンコーディングでエンコードする
 *
 * - UTF-8: TextEncoder + BOM (EF BB BF) 付与
 * - Shift_JIS / EUC-JP: encoding-japanese を動的importしてエンコード
 */
export async function encodeCsvString(
  csvText: string,
  encoding: CsvEncoding,
): Promise<Uint8Array> {
  if (encoding === 'utf-8') {
    const encoder = new TextEncoder()
    const encoded = encoder.encode(csvText)
    // UTF-8 BOM付与
    const bom = new Uint8Array([0xef, 0xbb, 0xbf])
    const result = new Uint8Array(bom.length + encoded.length)
    result.set(bom)
    result.set(encoded, bom.length)
    return result
  }

  // Shift_JIS / EUC-JP: encoding-japanese を動的import
  let Encoding: typeof import('encoding-japanese')
  try {
    Encoding = await import('encoding-japanese')
  } catch {
    throw new Error(
      `エンコーディングライブラリの読み込みに失敗しました（encoding: ${encoding}）。` +
        `encoding-japanese パッケージがインストールされているか確認してください。`,
    )
  }

  const unicodeArray = Encoding.stringToCode(csvText)
  const targetEncoding = encoding === 'shift_jis' ? 'SJIS' : 'EUCJP'
  const encoded = Encoding.convert(unicodeArray, {
    to: targetEncoding,
    from: 'UNICODE',
  })

  return new Uint8Array(encoded)
}
