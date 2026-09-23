import { useEffect, useState } from 'react'
import { useProgress } from '../store/progress'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Применяет выбранную тему к <html> и возвращает итоговую: светлую или тёмную. */
export function useAppliedTheme(): 'light' | 'dark' {
  const theme = useProgress((s) => s.settings.theme)
  const [systemDark, setSystemDark] = useState(() => media().matches)
  useEffect(() => {
    const m = media()
    const on = () => setSystemDark(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  const resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])
  return resolved
}
