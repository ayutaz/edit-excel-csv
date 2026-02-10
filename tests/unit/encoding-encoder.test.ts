import { describe, it, expect } from 'vitest'
import { encodeCsvString } from '@/core/encoding/encoder'

describe('encodeCsvString', () => {
  it('UTF-8出力にBOM付与確認', async () => {
    const result = await encodeCsvString('Hello', 'utf-8')

    // BOM: EF BB BF
    expect(result[0]).toBe(0xef)
    expect(result[1]).toBe(0xbb)
    expect(result[2]).toBe(0xbf)

    // 内容
    const decoder = new TextDecoder('utf-8')
    const decoded = decoder.decode(result.slice(3))
    expect(decoded).toBe('Hello')
  })

  it('UTF-8出力で日本語が正しくエンコードされる', async () => {
    const result = await encodeCsvString('名前,年齢', 'utf-8')

    // BOMの後に日本語が続く
    expect(result[0]).toBe(0xef)
    expect(result[1]).toBe(0xbb)
    expect(result[2]).toBe(0xbf)

    const decoder = new TextDecoder('utf-8')
    const decoded = decoder.decode(result.slice(3))
    expect(decoded).toBe('名前,年齢')
  })

  it('Shift_JIS出力の正当性', async () => {
    const result = await encodeCsvString('名前', 'shift_jis')

    // Shift_JIS "名前": 96 BC 91 4F
    expect(result[0]).toBe(0x96)
    expect(result[1]).toBe(0xbc)
    expect(result[2]).toBe(0x91)
    expect(result[3]).toBe(0x4f)

    // BOMなし
    expect(result.length).toBe(4)
  })

  it('EUC-JP出力の正当性', async () => {
    const result = await encodeCsvString('名前', 'euc-jp')

    // EUC-JP "名前": CC BE C1 B0
    expect(result[0]).toBe(0xcc)
    expect(result[1]).toBe(0xbe)
    expect(result[2]).toBe(0xc1)
    expect(result[3]).toBe(0xb0)

    // BOMなし
    expect(result.length).toBe(4)
  })

  it('Shift_JIS出力のCSVラウンドトリップ', async () => {
    const csvText = '名前,年齢\n田中太郎,30'
    const encoded = await encodeCsvString(csvText, 'shift_jis')

    // TextDecoderでデコードして元に戻るか確認
    const decoder = new TextDecoder('shift_jis')
    const decoded = decoder.decode(encoded)
    expect(decoded).toBe(csvText)
  })

  it('EUC-JP出力のCSVラウンドトリップ', async () => {
    const csvText = '名前,年齢\n佐藤一郎,40'
    const encoded = await encodeCsvString(csvText, 'euc-jp')

    const decoder = new TextDecoder('euc-jp')
    const decoded = decoder.decode(encoded)
    expect(decoded).toBe(csvText)
  })

  it('空文字列のエンコード', async () => {
    const utf8 = await encodeCsvString('', 'utf-8')
    // BOMのみ
    expect(utf8.length).toBe(3)
    expect(utf8[0]).toBe(0xef)

    const sjis = await encodeCsvString('', 'shift_jis')
    expect(sjis.length).toBe(0)

    const euc = await encodeCsvString('', 'euc-jp')
    expect(euc.length).toBe(0)
  })
})
