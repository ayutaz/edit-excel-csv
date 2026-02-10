import type { jsPDF } from 'jspdf'

let cachedFontBase64: string | null = null
let loadingPromise: Promise<string> | null = null

const FONT_NAME = 'NotoSansJP'
const FONT_STYLE = 'normal'
const FONT_FILE = 'NotoSansJP-Regular-subset.ttf'

/**
 * 日本語フォント(Noto Sans JP)をjsPDFに登録する
 * 初回はfetchでフォントを取得し、2回目以降はキャッシュから即座に登録する
 * 並行呼び出し時もfetchは1回のみ実行される
 */
export async function loadJapaneseFont(doc: jsPDF): Promise<void> {
  if (!cachedFontBase64) {
    if (!loadingPromise) {
      loadingPromise = fetchAndEncodeFont()
    }
    cachedFontBase64 = await loadingPromise
  }

  doc.addFileToVFS(FONT_FILE, cachedFontBase64)
  doc.addFont(FONT_FILE, FONT_NAME, FONT_STYLE)
  doc.setFont(FONT_NAME)
}

async function fetchAndEncodeFont(): Promise<string> {
  const fontUrl = `${import.meta.env.BASE_URL}fonts/${FONT_FILE}`
  const response = await fetch(fontUrl)
  if (!response.ok) {
    throw new Error(`日本語フォントの取得に失敗しました (HTTP ${response.status})`)
  }
  const arrayBuffer = await response.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  // TextDecoder('latin1')でバイト列→文字列変換（O(n)、高速）
  const binary = new TextDecoder('latin1').decode(bytes)
  return btoa(binary)
}

/**
 * 日本語フォント名を返す（autoTable等のstyles設定用）
 */
export function getJapaneseFontName(): string {
  return FONT_NAME
}
