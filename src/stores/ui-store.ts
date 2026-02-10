import { create } from 'zustand'

interface UIState {
  showWelcome: boolean
  setShowWelcome: (show: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  showWelcome: true,
  setShowWelcome: (showWelcome) => set({ showWelcome }),
}))
