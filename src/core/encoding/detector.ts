import type { EncodingDetectionResult } from './types'

/**
 * ArrayBufferからCSVファイルのエンコーディングを検出する
 *
 * 検出アルゴリズム:
 * 1. BOMチェック（UTF-8 BOM EF BB BF → UTF-8確定）
 * 2. TextDecoder('utf-8', { fatal: true }) で試行 → 成功ならUTF-8
 * 3. UTF-8失敗時：先頭8KBのバイト頻度分析でShift_JIS vs EUC-JP判定
 * 4. フォールバック：Shift_JIS（日本で最も一般的な非UTF-8エンコーディング）
 */
export function detectEncoding(buffer: ArrayBuffer): EncodingDetectionResult {
  const bytes = new Uint8Array(buffer)

  // 空バッファはUTF-8フォールバック
  if (bytes.length === 0) {
    return { encoding: 'utf-8', confidence: 'low', hasBom: false }
  }

  // 1. BOMチェック
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { encoding: 'utf-8', confidence: 'high', hasBom: true }
  }

  // 2. UTF-8 fatal試行
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    decoder.decode(buffer)
    return { encoding: 'utf-8', confidence: 'high', hasBom: false }
  } catch {
    // UTF-8デコード失敗 → 非UTF-8
  }

  // 3. バイト頻度分析（先頭8KB、subarrayでコピー回避）
  const analysisBytes = bytes.subarray(0, Math.min(bytes.length, 8192))
  return analyzeByteFrequency(analysisBytes)
}

/**
 * バイト頻度分析でShift_JIS vs EUC-JPを判定する
 *
 * Shift_JISリードバイト: 0x81-0x9F, 0xE0-0xEF
 * EUC-JPリードバイト: 0xA1-0xFE
 */
function analyzeByteFrequency(bytes: Uint8Array): EncodingDetectionResult {
  let sjisScore = 0
  let eucScore = 0

  for (let i = 0; i < bytes.length - 1; i++) {
    const b = bytes[i]!
    const next = bytes[i + 1]!

    // Shift_JISの2バイト文字パターン
    if ((b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xef)) {
      if ((next >= 0x40 && next <= 0x7e) || (next >= 0x80 && next <= 0xfc)) {
        sjisScore++
        i++ // 2バイト文字なので次のバイトをスキップ
        continue
      }
    }

    // EUC-JPの2バイト文字パターン
    if (b >= 0xa1 && b <= 0xfe) {
      if (next >= 0xa1 && next <= 0xfe) {
        eucScore++
        i++ // 2バイト文字なので次のバイトをスキップ
        continue
      }
    }

    // EUC-JP半角カナ (SS2: 0x8E + 0xA1-0xDF)
    if (b === 0x8e) {
      if (next >= 0xa1 && next <= 0xdf) {
        eucScore++
        i++
        continue
      }
    }
  }

  // 信頼度判定:
  // - 一方のスコアが他方の2倍以上 → 'high'（明確な差がある）
  // - 差はあるが2倍未満 → 'medium'（バイトパターンが重複しうるため確信度中）
  // - 両方0 → Shift_JISをlow信頼度でフォールバック（日本で最も一般的な非UTF-8）
  if (eucScore > sjisScore) {
    const confidence = eucScore > sjisScore * 2 ? 'high' : 'medium'
    return { encoding: 'euc-jp', confidence, hasBom: false }
  }

  const confidence = sjisScore > 0 ? (sjisScore > eucScore * 2 ? 'high' : 'medium') : 'low'
  return { encoding: 'shift_jis', confidence, hasBom: false }
}
