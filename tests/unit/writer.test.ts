import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { downloadBlob, MIME_TYPES } from '@/core/file-io/writer'

describe('downloadBlob', () => {
  let mockClick: ReturnType<typeof vi.fn>
  let mockAppendChild: ReturnType<typeof vi.fn>
  let mockRemoveChild: ReturnType<typeof vi.fn>
  let mockCreateObjectURL: ReturnType<typeof vi.fn>
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>
  let createdAnchor: HTMLAnchorElement

  beforeEach(() => {
    vi.useFakeTimers()

    mockClick = vi.fn()
    createdAnchor = {
      href: '',
      download: '',
      click: mockClick,
    } as unknown as HTMLAnchorElement

    vi.spyOn(document, 'createElement').mockReturnValue(
      createdAnchor as unknown as HTMLElement,
    )
    mockAppendChild = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => node)
    mockRemoveChild = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node) => node)

    mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    mockRevokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('Blobからオブジェクト URLを作成する', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'test.txt')

    expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
  })

  it('a要素を作成してDOMに追加・クリック・除去する', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'download.txt')

    expect(document.createElement).toHaveBeenCalledWith('a')
    expect(createdAnchor.href).toBe('blob:mock-url')
    expect(createdAnchor.download).toBe('download.txt')
    expect(mockAppendChild).toHaveBeenCalledWith(createdAnchor)
    expect(mockClick).toHaveBeenCalledOnce()
    expect(mockRemoveChild).toHaveBeenCalledWith(createdAnchor)
  })

  it('1秒後にrevokeObjectURLが呼ばれる', () => {
    const blob = new Blob(['test'], { type: 'text/plain' })
    downloadBlob(blob, 'test.txt')

    expect(mockRevokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})

describe('MIME_TYPES', () => {
  it('xlsxの正しいMIMEタイプを持つ', () => {
    expect(MIME_TYPES.xlsx).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
  })

  it('csvの正しいMIMEタイプを持つ', () => {
    expect(MIME_TYPES.csv).toBe('text/csv;charset=utf-8')
  })
})
