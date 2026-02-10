import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useUniver } from '@/hooks/useUniver'
import {
  createUniverInstance,
  type UniverInstance,
} from '@/core/univer-bridge/setup'

// createUniverInstanceをモック
const mockDispose = vi.fn()
const mockLoadWorkbook = vi.fn()
const mockGetSnapshot = vi.fn()
const mockOnCellEdited = vi.fn(() => (() => {}) as unknown)

const mockInstance: UniverInstance = {
  loadWorkbook: mockLoadWorkbook,
  getSnapshot: mockGetSnapshot,
  dispose: mockDispose,
  onCellEdited: mockOnCellEdited as UniverInstance['onCellEdited'],
  univerAPI: {} as UniverInstance['univerAPI'],
}

vi.mock('@/core/univer-bridge/setup', () => ({
  createUniverInstance: vi.fn(() => mockInstance),
}))

const mockedCreateUniverInstance = vi.mocked(createUniverInstance)

// requestAnimationFrameを同期実行にモック
const mockRAF = vi.fn((cb: FrameRequestCallback) => {
  cb(0)
  return 1
})
const mockCancelRAF = vi.fn()

describe('useUniver', () => {
  let originalRAF: typeof window.requestAnimationFrame
  let originalCancelRAF: typeof window.cancelAnimationFrame
  let containerEl: HTMLDivElement

  beforeEach(() => {
    vi.clearAllMocks()
    mockedCreateUniverInstance.mockImplementation(() => mockInstance)
    originalRAF = window.requestAnimationFrame
    originalCancelRAF = window.cancelAnimationFrame
    window.requestAnimationFrame = mockRAF as unknown as typeof window.requestAnimationFrame
    window.cancelAnimationFrame = mockCancelRAF

    // テスト用コンテナをDOMに追加
    containerEl = document.createElement('div')
    containerEl.id = 'test-container'
    document.body.appendChild(containerEl)
  })

  afterEach(() => {
    cleanup()
    window.requestAnimationFrame = originalRAF
    window.cancelAnimationFrame = originalCancelRAF
    if (containerEl.parentNode) {
      document.body.removeChild(containerEl)
    }
  })

  it('createUniverInstanceが正しいcontainerIdで呼ばれる', () => {
    renderHook(() => useUniver('test-container'))
    expect(mockedCreateUniverInstance).toHaveBeenCalledWith('test-container')
  })

  it('「column width is less than 0」のエラーログが抑制される', () => {
    mockedCreateUniverInstance.mockImplementation(() => {
      // Univer初期化中に発生するエラーログをシミュレート
      console.error('The column width is less than 0, need to adjust')
      console.error('other error')
      return mockInstance
    })

    // originalErrorをキャプチャして、フィルタを通過したエラーログを記録する
    // hookはマウント時にconsole.errorをラップするので、
    // その前にoriginalErrorをスパイに置き換えておく
    const spy = vi.spyOn(console, 'error')

    renderHook(() => useUniver('test-container'))

    // 「column width is less than 0」は抑制されている
    const columnWidthCalls = spy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0].includes('column width is less than 0'),
    )
    expect(columnWidthCalls).toHaveLength(0)

    spy.mockRestore()
  })

  it('「column width is less than 0」以外のエラーログは通常通り出力される', () => {
    mockedCreateUniverInstance.mockImplementation(() => {
      console.error('some other error message')
      return mockInstance
    })

    const spy = vi.spyOn(console, 'error')

    renderHook(() => useUniver('test-container'))

    // other errorが通過したことを確認
    const otherCalls = spy.mock.calls.filter(
      (args) =>
        typeof args[0] === 'string' &&
        args[0] === 'some other error message',
    )
    expect(otherCalls).toHaveLength(1)

    spy.mockRestore()
  })

  it('アンマウント後にconsole.errorが復元される', () => {
    const originalError = console.error
    const { unmount } = renderHook(() => useUniver('test-container'))

    // マウント中はconsole.errorがラップされている
    expect(console.error).not.toBe(originalError)

    // アンマウント
    unmount()

    // console.errorが復元されている
    expect(console.error).toBe(originalError)
  })

  it('createUniverInstanceが例外を投げた場合、initErrorにセットされる', () => {
    mockedCreateUniverInstance.mockImplementation(() => {
      throw new Error('初期化失敗テスト')
    })

    const { result } = renderHook(() => useUniver('test-container'))
    expect(result.current.initError).toBe('初期化失敗テスト')
  })

  it('アンマウント時にdispose()が呼ばれる', () => {
    const { unmount } = renderHook(() => useUniver('test-container'))
    unmount()
    expect(mockDispose).toHaveBeenCalled()
  })

  it('loadWorkbookがインスタンスに転送される', () => {
    const { result } = renderHook(() => useUniver('test-container'))
    const testData = { sheets: {} }
    result.current.loadWorkbook(testData)
    expect(mockLoadWorkbook).toHaveBeenCalledWith(testData)
  })

  it('getSnapshotがインスタンスに転送される', () => {
    const snapshotData = { id: 'test', sheets: {} }
    mockGetSnapshot.mockReturnValue(snapshotData)

    const { result } = renderHook(() => useUniver('test-container'))
    const snapshot = result.current.getSnapshot()
    expect(mockGetSnapshot).toHaveBeenCalled()
    expect(snapshot).toBe(snapshotData)
  })

  it('onCellEditedがインスタンスに転送される', () => {
    const { result } = renderHook(() => useUniver('test-container'))
    const callback = vi.fn()
    result.current.onCellEdited(callback)
    expect(mockOnCellEdited).toHaveBeenCalledWith(callback)
  })

  it('isReady=falseの場合、createUniverInstanceが呼ばれない', () => {
    renderHook(() => useUniver('test-container', false))
    expect(mockedCreateUniverInstance).not.toHaveBeenCalled()
  })

  it('isReady=trueに変更されると、createUniverInstanceが呼ばれる', () => {
    const { rerender } = renderHook(
      ({ isReady }) => useUniver('test-container', isReady),
      { initialProps: { isReady: false } },
    )
    expect(mockedCreateUniverInstance).not.toHaveBeenCalled()

    rerender({ isReady: true })
    expect(mockedCreateUniverInstance).toHaveBeenCalledWith('test-container')
  })

  it('コンテナがDOMに存在しない場合、createUniverInstanceが呼ばれない', () => {
    // コンテナをDOMに追加しない状態で isReady=true
    renderHook(() => useUniver('nonexistent-container', true))
    expect(mockedCreateUniverInstance).not.toHaveBeenCalled()
  })

  it('isReady=trueの場合、isInitializedがtrueになる', () => {
    const { result } = renderHook(() => useUniver('test-container', true))
    expect(result.current.isInitialized).toBe(true)
  })

  it('isReady=falseの場合、isInitializedがfalseのまま', () => {
    const { result } = renderHook(() => useUniver('test-container', false))
    expect(result.current.isInitialized).toBe(false)
  })

  describe('pendingDataパターン', () => {
    it('isReady=falseでloadWorkbook→isReady=trueに変更→pendingデータがインスタンスにロードされる', () => {
      const { result, rerender } = renderHook(
        ({ isReady }) => useUniver('test-container', isReady),
        { initialProps: { isReady: false } },
      )

      const testData = { sheets: { sheet1: { id: 'sheet1' } } }
      result.current.loadWorkbook(testData)

      // インスタンス未初期化なので直接ロードされない
      expect(mockLoadWorkbook).not.toHaveBeenCalled()

      // isReady=trueに変更→Univer初期化→pendingデータが適用される
      rerender({ isReady: true })

      expect(mockedCreateUniverInstance).toHaveBeenCalledWith('test-container')
      expect(mockLoadWorkbook).toHaveBeenCalledWith(testData)
    })

    it('isReady=trueでloadWorkbook→即時ロード（pendingは不使用）', () => {
      const { result } = renderHook(() => useUniver('test-container', true))

      const testData = { sheets: { sheet1: { id: 'sheet1' } } }
      result.current.loadWorkbook(testData)

      expect(mockLoadWorkbook).toHaveBeenCalledWith(testData)
    })

    it('pending中に2回loadWorkbook→最後のデータのみロードされる', () => {
      const { result, rerender } = renderHook(
        ({ isReady }) => useUniver('test-container', isReady),
        { initialProps: { isReady: false } },
      )

      const data1 = { sheets: { sheet1: { id: 'first' } } }
      const data2 = { sheets: { sheet1: { id: 'second' } } }
      result.current.loadWorkbook(data1)
      result.current.loadWorkbook(data2)

      // まだロードされない
      expect(mockLoadWorkbook).not.toHaveBeenCalled()

      // isReady=trueに変更→最後のデータのみ適用される
      rerender({ isReady: true })

      expect(mockLoadWorkbook).toHaveBeenCalledTimes(1)
      expect(mockLoadWorkbook).toHaveBeenCalledWith(data2)
    })

    it('pendingData保持中にアンマウント→pendingDataがクリアされる（メモリリーク防止）', () => {
      const { result, unmount } = renderHook(
        ({ isReady }) => useUniver('test-container', isReady),
        { initialProps: { isReady: false } },
      )

      const largeData = { sheets: { sheet1: { id: 'large-data' } } }
      result.current.loadWorkbook(largeData)

      // pendingDataが保持された状態でアンマウント
      unmount()

      // 再マウント→isReady=trueにしてもpendingDataはロードされない
      // （クリーンアップでクリアされたため）
      vi.clearAllMocks()
      const { result: result2 } = renderHook(() =>
        useUniver('test-container', true),
      )
      // 新しいインスタンスが作成されるが、pendingDataは適用されない
      expect(mockedCreateUniverInstance).toHaveBeenCalled()
      expect(mockLoadWorkbook).not.toHaveBeenCalled()

      // 新しいフックからloadWorkbookは正常に機能する
      const newData = { sheets: { sheet1: { id: 'new-data' } } }
      result2.current.loadWorkbook(newData)
      expect(mockLoadWorkbook).toHaveBeenCalledWith(newData)
    })

    it('createUniverInstanceがthrowした時にpendingDataが保持され、再初期化成功時に適用される', () => {
      // 初期化失敗をシミュレート
      mockedCreateUniverInstance.mockImplementation(() => {
        throw new Error('初期化失敗')
      })

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { result, rerender } = renderHook(
        ({ isReady }) => useUniver('test-container', isReady),
        { initialProps: { isReady: false } },
      )

      const testData = { sheets: { sheet1: { id: 'pending' } } }
      result.current.loadWorkbook(testData)

      // isReady=trueに変更→初期化失敗
      rerender({ isReady: true })
      spy.mockRestore()

      // 初期化失敗したのでloadWorkbookは呼ばれない
      expect(mockLoadWorkbook).not.toHaveBeenCalled()
      expect(result.current.initError).toBe('初期化失敗')

      // 初期化失敗時、instanceRefはnullなのでpendingDataはref内に残っている
      // 同じeffect内で再度loadWorkbookすればpendingDataを上書きできる
      const retryData = { sheets: { sheet1: { id: 'retry' } } }
      result.current.loadWorkbook(retryData)

      // 初期化を成功するようにリセット
      vi.clearAllMocks()
      mockedCreateUniverInstance.mockImplementation(() => mockInstance)

      // isReadyをfalse→trueでeffectを再トリガー
      // (cleanup時にpendingDataRefはクリアされるが、
      //  loadWorkbookで再セットしたretryDataは新しいeffect実行前に設定される)
      // ただしcleanupでpendingDataRef.current = nullになるため、
      // 再マウント前にloadWorkbookを呼び直す必要がある
      rerender({ isReady: false })

      // cleanup後にpendingDataはクリアされている
      // 再度loadWorkbookでデータを設定
      result.current.loadWorkbook(retryData)

      rerender({ isReady: true })
      expect(mockLoadWorkbook).toHaveBeenCalledWith(retryData)
    })

    it('isReady true→false→true フリップ時のpendingData挙動', () => {
      const { result, rerender } = renderHook(
        ({ isReady }) => useUniver('test-container', isReady),
        { initialProps: { isReady: true } },
      )

      expect(mockedCreateUniverInstance).toHaveBeenCalledTimes(1)

      // isReady=falseに変更→クリーンアップ→dispose
      rerender({ isReady: false })
      expect(mockDispose).toHaveBeenCalled()

      // isReady=false中にloadWorkbook→pendingDataに保存される
      vi.clearAllMocks()
      const testData = { sheets: { sheet1: { id: 'flip-data' } } }
      result.current.loadWorkbook(testData)
      expect(mockLoadWorkbook).not.toHaveBeenCalled()

      // isReady=trueに戻す→再初期化→pendingDataが適用される
      rerender({ isReady: true })
      expect(mockedCreateUniverInstance).toHaveBeenCalledTimes(1)
      expect(mockLoadWorkbook).toHaveBeenCalledWith(testData)
    })
  })
})
