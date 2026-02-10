import { useEffect } from 'react'
import { useFileStore } from '@/stores/file-store'

/** isDirty時にブラウザ離脱警告を表示する */
export function useBeforeUnload() {
  const isDirty = useFileStore((s) => s.isDirty)

  useEffect(() => {
    if (!isDirty) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
