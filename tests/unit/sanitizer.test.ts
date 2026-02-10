import { describe, it, expect, vi } from 'vitest'
import { detectCsvInjection } from '@/core/security/sanitizer'

describe('detectCsvInjection', () => {
  it('安全なデータでは検出しない', () => {
    const data = [
      ['名前', '年齢'],
      ['田中', '30'],
    ]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(false)
    expect(result.dangerousCells).toHaveLength(0)
  })

  it('= プレフィックスを検出する', () => {
    const data = [['=SUM(A1:A10)', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '=SUM(A1:A10)' },
    ])
  })

  it('+ プレフィックスを検出する', () => {
    const data = [['+cmd|echo test', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '+cmd|echo test' },
    ])
  })

  it('- プレフィックスを検出する', () => {
    const data = [['-cmd|echo test', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '-cmd|echo test' },
    ])
  })

  it('@ プレフィックスを検出する', () => {
    const data = [['@SUM(A1)', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '@SUM(A1)' },
    ])
  })

  it('\\t プレフィックスを検出する', () => {
    const data = [['\tcmd', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '\tcmd' },
    ])
  })

  it('\\r プレフィックスを検出する', () => {
    const data = [['\rcmd', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '\rcmd' },
    ])
  })

  it('\\n プレフィックスを検出する', () => {
    const data = [['\ncmd', 'safe']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '\ncmd' },
    ])
  })

  it('複数の危険なセルを検出する', () => {
    const data = [
      ['=formula', 'safe', '+cmd'],
      ['normal', '@mention', 'ok'],
    ]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(true)
    expect(result.dangerousCells).toHaveLength(3)
    expect(result.dangerousCells).toEqual([
      { row: 0, col: 0, value: '=formula' },
      { row: 0, col: 2, value: '+cmd' },
      { row: 1, col: 1, value: '@mention' },
    ])
  })

  it('空データではfalseを返す', () => {
    const result = detectCsvInjection([])
    expect(result.hasDangerousCells).toBe(false)
    expect(result.dangerousCells).toHaveLength(0)
  })

  it('空文字列セルは無視する', () => {
    const data = [['', '', '']]
    const result = detectCsvInjection(data)
    expect(result.hasDangerousCells).toBe(false)
  })

  it('検出時にconsole.warnが呼ばれる', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = [['=dangerous']]
    detectCsvInjection(data)
    expect(warnSpy).toHaveBeenCalledOnce()
    warnSpy.mockRestore()
  })

  it('安全なデータではconsole.warnが呼ばれない', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const data = [['safe', 'data']]
    detectCsvInjection(data)
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })
})
