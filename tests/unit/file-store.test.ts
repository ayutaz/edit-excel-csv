import { describe, it, expect, beforeEach } from 'vitest'
import { useFileStore } from '@/stores/file-store'

describe('useFileStore', () => {
  beforeEach(() => {
    useFileStore.getState().reset()
  })

  it('initial state', () => {
    const state = useFileStore.getState()
    expect(state.fileName).toBeNull()
    expect(state.fileType).toBeNull()
    expect(state.isDirty).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('setFile updates fileName and fileType', () => {
    useFileStore.getState().setFile('test.xlsx', 'xlsx')
    const state = useFileStore.getState()
    expect(state.fileName).toBe('test.xlsx')
    expect(state.fileType).toBe('xlsx')
    expect(state.isDirty).toBe(false)
  })

  it('setFile clears previous error', () => {
    useFileStore.getState().setError('some error')
    useFileStore.getState().setFile('test.csv', 'csv')
    const state = useFileStore.getState()
    expect(state.error).toBeNull()
    expect(state.fileName).toBe('test.csv')
  })

  it('setDirty updates isDirty', () => {
    useFileStore.getState().setDirty(true)
    expect(useFileStore.getState().isDirty).toBe(true)
  })

  it('setLoading updates isLoading', () => {
    useFileStore.getState().setLoading(true)
    expect(useFileStore.getState().isLoading).toBe(true)
  })

  it('setError updates error and clears loading', () => {
    useFileStore.getState().setLoading(true)
    useFileStore.getState().setError('test error')
    const state = useFileStore.getState()
    expect(state.error).toBe('test error')
    expect(state.isLoading).toBe(false)
  })

  it('setError with null clears error and loading', () => {
    useFileStore.getState().setError('some error')
    useFileStore.getState().setError(null)
    const state = useFileStore.getState()
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('reset clears all state', () => {
    useFileStore.getState().setFile('test.xlsx', 'xlsx')
    useFileStore.getState().setDirty(true)
    useFileStore.getState().setLoading(true)
    useFileStore.getState().setError('error')
    useFileStore.getState().reset()
    const state = useFileStore.getState()
    expect(state.fileName).toBeNull()
    expect(state.fileType).toBeNull()
    expect(state.isDirty).toBe(false)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })
})
