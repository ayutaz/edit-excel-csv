import { describe, it, expect } from 'vitest'
import {
  validateFileExtension,
  validateMagicBytes,
  validateFile,
} from '@/core/file-io/validator'

// テスト用ヘルパー: 指定バイト列のArrayBufferを生成
function createBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

// テスト用ヘルパー: Fileオブジェクトを生成
function createMockFile(
  name: string,
  size: number,
  content?: ArrayBuffer,
): File {
  const bytes = content
    ? new Uint8Array(content)
    : new Uint8Array([0x50, 0x4b, 0x03, 0x04])
  const file = new File([bytes], name, { type: 'application/octet-stream' })
  if (size !== bytes.byteLength) {
    Object.defineProperty(file, 'size', { value: size })
  }
  return file
}

describe('validateFileExtension', () => {
  it('xlsxを許可する', () => {
    expect(validateFileExtension('test.xlsx')).toEqual({ valid: true })
  })

  it('xlsを許可する', () => {
    expect(validateFileExtension('test.xls')).toEqual({ valid: true })
  })

  it('csvを許可する', () => {
    expect(validateFileExtension('test.csv')).toEqual({ valid: true })
  })

  it('大文字拡張子を許可する (.XLSX)', () => {
    expect(validateFileExtension('test.XLSX')).toEqual({ valid: true })
  })

  it('混在ケースを許可する (.Csv)', () => {
    expect(validateFileExtension('test.Csv')).toEqual({ valid: true })
  })

  it('pdfを拒否する', () => {
    const result = validateFileExtension('test.pdf')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('対応していないファイル形式です')
  })

  it('拡張子なしを拒否する', () => {
    const result = validateFileExtension('testfile')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('対応していないファイル形式です')
  })
})

describe('validateMagicBytes', () => {
  it('正しいxlsxマジックバイトを許可する (PK ZIP)', () => {
    const buffer = createBuffer([0x50, 0x4b, 0x03, 0x04, 0x00])
    expect(validateMagicBytes(buffer, '.xlsx')).toEqual({ valid: true })
  })

  it('正しいxlsマジックバイトを許可する (OLE2)', () => {
    const buffer = createBuffer([0xd0, 0xcf, 0x11, 0xe0, 0x00])
    expect(validateMagicBytes(buffer, '.xls')).toEqual({ valid: true })
  })

  it('csvはマジックバイトチェックをスキップする', () => {
    const buffer = createBuffer([0x00, 0x00])
    expect(validateMagicBytes(buffer, '.csv')).toEqual({ valid: true })
  })

  it('xlsxのマジックバイト不一致を検出する', () => {
    const buffer = createBuffer([0x00, 0x00, 0x00, 0x00])
    const result = validateMagicBytes(buffer, '.xlsx')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('ファイルの内容が拡張子と一致しません')
  })

  it('xlsのマジックバイト不一致を検出する', () => {
    const buffer = createBuffer([0x50, 0x4b, 0x03, 0x04])
    const result = validateMagicBytes(buffer, '.xls')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('ファイルの内容が拡張子と一致しません')
  })
})

describe('validateFile', () => {
  it('正常なxlsxファイルを許可する', async () => {
    const buffer = createBuffer([0x50, 0x4b, 0x03, 0x04])
    const file = createMockFile('test.xlsx', buffer.byteLength, buffer)
    const result = await validateFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('正常なcsvファイルを許可する', async () => {
    const csvContent = new TextEncoder().encode('a,b,c\n1,2,3')
    const file = createMockFile('data.csv', csvContent.byteLength, csvContent.buffer as ArrayBuffer)
    const result = await validateFile(file)
    expect(result).toEqual({ valid: true })
  })

  it('不正な拡張子を拒否する', async () => {
    const file = createMockFile('test.pdf', 100)
    const result = await validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('対応していないファイル形式です')
  })

  it('50MB超のファイルを拒否する', async () => {
    const file = createMockFile('big.xlsx', 50 * 1024 * 1024 + 1)
    const result = await validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('ファイルサイズが上限（50MB）を超えています')
  })

  it('マジックバイト不一致のxlsxを拒否する', async () => {
    const badBuffer = createBuffer([0x00, 0x00, 0x00, 0x00])
    const file = createMockFile('test.xlsx', badBuffer.byteLength, badBuffer)
    const result = await validateFile(file)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('ファイルの内容が拡張子と一致しません')
  })

  it('大文字拡張子 (.XLSX) を許可する', async () => {
    const buffer = createBuffer([0x50, 0x4b, 0x03, 0x04])
    const file = createMockFile('TEST.XLSX', buffer.byteLength, buffer)
    const result = await validateFile(file)
    expect(result).toEqual({ valid: true })
  })
})
