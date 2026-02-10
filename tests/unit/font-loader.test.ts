import { describe, it, expect, vi, beforeEach } from 'vitest'

// テストごとにモジュールキャッシュをリセットして独立性を保つ
beforeEach(() => {
  vi.resetModules()
  vi.restoreAllMocks()
})

/** テスト用のフォントバイナリデータ（小さなダミー） */
function createDummyFontBuffer(): ArrayBuffer {
  const data = new Uint8Array([0x00, 0x01, 0x00, 0x00, 0x41, 0x42, 0x43])
  return data.buffer as ArrayBuffer
}

describe('loadJapaneseFont', () => {
  it('フォントをフェッチしてjsPDFに登録する', async () => {
    const dummyBuffer = createDummyFontBuffer()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(dummyBuffer),
      }),
    )

    const { loadJapaneseFont } = await import('@/core/pdf/font-loader')

    const mockDoc = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }

    await loadJapaneseFont(mockDoc as never)

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(mockDoc.addFileToVFS).toHaveBeenCalledWith(
      'NotoSansJP-Regular-subset.ttf',
      expect.any(String),
    )
    expect(mockDoc.addFont).toHaveBeenCalledWith(
      'NotoSansJP-Regular-subset.ttf',
      'NotoSansJP',
      'normal',
    )
    expect(mockDoc.setFont).toHaveBeenCalledWith('NotoSansJP')
  })

  it('2回目以降はフェッチせずキャッシュを使用する', async () => {
    const dummyBuffer = createDummyFontBuffer()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(dummyBuffer),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loadJapaneseFont } = await import('@/core/pdf/font-loader')

    const mockDoc1 = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }
    const mockDoc2 = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }

    await loadJapaneseFont(mockDoc1 as never)
    await loadJapaneseFont(mockDoc2 as never)

    // fetchは1回だけ呼ばれる
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // 両方のdocにフォントが登録される
    expect(mockDoc1.addFileToVFS).toHaveBeenCalledTimes(1)
    expect(mockDoc2.addFileToVFS).toHaveBeenCalledTimes(1)
  })

  it('HTTPエラー時にエラーをスローする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    )

    const { loadJapaneseFont } = await import('@/core/pdf/font-loader')

    const mockDoc = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }

    await expect(loadJapaneseFont(mockDoc as never)).rejects.toThrow(
      '日本語フォントの取得に失敗しました (HTTP 404)',
    )
  })

  it('ネットワークエラー時にエラーをスローする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const { loadJapaneseFont } = await import('@/core/pdf/font-loader')

    const mockDoc = {
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }

    await expect(loadJapaneseFont(mockDoc as never)).rejects.toThrow(
      'Failed to fetch',
    )
  })

  it('並行呼び出し時にfetchが1回のみ実行される', async () => {
    const dummyBuffer = createDummyFontBuffer()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(dummyBuffer),
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loadJapaneseFont } = await import('@/core/pdf/font-loader')

    const mockDocs = Array.from({ length: 3 }, () => ({
      addFileToVFS: vi.fn(),
      addFont: vi.fn(),
      setFont: vi.fn(),
    }))

    // 3つの呼び出しを同時に実行
    await Promise.all(
      mockDocs.map((doc) => loadJapaneseFont(doc as never)),
    )

    // fetchは1回だけ呼ばれる（レースコンディションなし）
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // 全てのdocにフォントが登録される
    for (const doc of mockDocs) {
      expect(doc.addFileToVFS).toHaveBeenCalledTimes(1)
      expect(doc.addFont).toHaveBeenCalledTimes(1)
      expect(doc.setFont).toHaveBeenCalledTimes(1)
    }
  })
})

describe('getJapaneseFontName', () => {
  it('フォント名を返す', async () => {
    const { getJapaneseFontName } = await import('@/core/pdf/font-loader')
    expect(getJapaneseFontName()).toBe('NotoSansJP')
  })
})
