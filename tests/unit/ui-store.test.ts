import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '@/stores/ui-store'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.getState().setShowWelcome(true)
  })

  it('initial showWelcome is true', () => {
    expect(useUIStore.getState().showWelcome).toBe(true)
  })

  it('setShowWelcome updates showWelcome to false', () => {
    useUIStore.getState().setShowWelcome(false)
    expect(useUIStore.getState().showWelcome).toBe(false)
  })

  it('setShowWelcome updates showWelcome back to true', () => {
    useUIStore.getState().setShowWelcome(false)
    useUIStore.getState().setShowWelcome(true)
    expect(useUIStore.getState().showWelcome).toBe(true)
  })
})
