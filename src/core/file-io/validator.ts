export interface ValidationResult {
  valid: boolean
  error?: string
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']

// Magic bytes for file type verification
const MAGIC_BYTES: Record<string, number[]> = {
  '.xlsx': [0x50, 0x4b, 0x03, 0x04], // PK ZIP header
  '.xls': [0xd0, 0xcf, 0x11, 0xe0], // OLE2 compound document
}

/**
 * ファイル拡張子のバリデーション
 */
export function validateFileExtension(fileName: string): ValidationResult {
  const ext = getExtension(fileName)
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: '対応していないファイル形式です' }
  }
  return { valid: true }
}

/**
 * マジックバイトのバリデーション
 * CSVはテキストベースのためスキップ
 */
export function validateMagicBytes(
  buffer: ArrayBuffer,
  extension: string,
): ValidationResult {
  const ext = extension.toLowerCase()

  // CSVはテキストベースのためマジックバイトチェック不要
  if (ext === '.csv') {
    return { valid: true }
  }

  const expected = MAGIC_BYTES[ext]
  if (!expected) {
    return { valid: true }
  }

  const bytes = new Uint8Array(buffer).slice(0, 4)
  for (let i = 0; i < expected.length; i++) {
    if (bytes[i] !== expected[i]) {
      return { valid: false, error: 'ファイルの内容が拡張子と一致しません' }
    }
  }

  return { valid: true }
}

/**
 * ファイル全体のバリデーション（拡張子 + サイズ + マジックバイト）
 * マジックバイトチェックにはArrayBufferが必要なため非同期
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  // 拡張子チェック
  const extResult = validateFileExtension(file.name)
  if (!extResult.valid) {
    return extResult
  }

  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'ファイルサイズが上限（50MB）を超えています' }
  }

  // マジックバイトチェック（CSV以外）
  const ext = getExtension(file.name)
  if (ext !== '.csv') {
    const buffer = await readFileAsArrayBuffer(file)
    const magicResult = validateMagicBytes(buffer, ext)
    if (!magicResult.valid) {
      return magicResult
    }
  }

  return { valid: true }
}

function readFileAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex === -1) return ''
  return fileName.slice(dotIndex).toLowerCase()
}
