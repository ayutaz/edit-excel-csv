import { describe, it, expect } from 'vitest'
import { detectEncoding } from '@/core/encoding/detector'

describe('detectEncoding', () => {
  it('UTF-8 BOM付き → encoding: utf-8, confidence: high, hasBom: true', () => {
    const bom = new Uint8Array([0xef, 0xbb, 0xbf])
    const text = new TextEncoder().encode('Hello, World!')
    const buffer = new Uint8Array(bom.length + text.length)
    buffer.set(bom)
    buffer.set(text, bom.length)

    const result = detectEncoding(buffer.buffer)
    expect(result).toEqual({
      encoding: 'utf-8',
      confidence: 'high',
      hasBom: true,
    })
  })

  it('UTF-8 BOMなし → encoding: utf-8, confidence: high, hasBom: false', () => {
    const text = new TextEncoder().encode('Hello, World!')
    const result = detectEncoding(text.buffer)
    expect(result).toEqual({
      encoding: 'utf-8',
      confidence: 'high',
      hasBom: false,
    })
  })

  it('UTF-8 日本語（BOMなし）→ encoding: utf-8, confidence: high', () => {
    const text = new TextEncoder().encode('こんにちは世界')
    const result = detectEncoding(text.buffer)
    expect(result.encoding).toBe('utf-8')
    expect(result.confidence).toBe('high')
    expect(result.hasBom).toBe(false)
  })

  it('Shift_JISバイト列 → shift_jis検出', () => {
    // "名前" in Shift_JIS: 0x96 0xBC 0x91 0x4F
    // "年齢" in Shift_JIS: 0x94 0x4E 0x97 0xEE
    const sjisBytes = new Uint8Array([
      0x96, 0xbc, 0x91, 0x4f, 0x2c, // 名前,
      0x94, 0x4e, 0x97, 0xee, 0x0a, // 年齢\n
      0x93, 0x63, 0x92, 0x86, 0x2c, // 田中,
      0x33, 0x30, // 30
    ])

    const result = detectEncoding(sjisBytes.buffer)
    expect(result.encoding).toBe('shift_jis')
    expect(result.hasBom).toBe(false)
  })

  it('EUC-JPバイト列 → euc-jp検出', () => {
    // "名前" in EUC-JP: 0xCC 0xBE 0xC1 0xB0
    // "年齢" in EUC-JP: 0xC7 0xAF 0xCE 0xF0
    const eucBytes = new Uint8Array([
      0xcc, 0xbe, 0xc1, 0xb0, 0x2c, // 名前,
      0xc7, 0xaf, 0xce, 0xf0, 0x0a, // 年齢\n
      0xba, 0xb4, 0xc6, 0xa3, 0x2c, // 佐藤,
      0x34, 0x30, // 40
    ])

    const result = detectEncoding(eucBytes.buffer)
    expect(result.encoding).toBe('euc-jp')
    expect(result.hasBom).toBe(false)
  })

  it('空バッファ → UTF-8フォールバック', () => {
    const empty = new ArrayBuffer(0)
    const result = detectEncoding(empty)
    expect(result).toEqual({
      encoding: 'utf-8',
      confidence: 'low',
      hasBom: false,
    })
  })

  it('ASCIIのみ → UTF-8（valid UTF-8）', () => {
    const ascii = new TextEncoder().encode('Name,Age\nAlice,30\nBob,25')
    const result = detectEncoding(ascii.buffer)
    expect(result.encoding).toBe('utf-8')
    expect(result.confidence).toBe('high')
  })

  it('テストフィクスチャ: Shift_JIS CSVファイル', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(__dirname, '../fixtures/shift_jis_sample.csv')
    const fileBuffer = fs.readFileSync(filePath)
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    )

    const result = detectEncoding(arrayBuffer)
    expect(result.encoding).toBe('shift_jis')
  })

  it('テストフィクスチャ: EUC-JP CSVファイル', async () => {
    const fs = await import('fs')
    const path = await import('path')
    const filePath = path.resolve(__dirname, '../fixtures/euc_jp_sample.csv')
    const fileBuffer = fs.readFileSync(filePath)
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    )

    const result = detectEncoding(arrayBuffer)
    expect(result.encoding).toBe('euc-jp')
  })
})
