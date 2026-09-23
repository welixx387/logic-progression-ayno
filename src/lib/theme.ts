import { useEffect, useState } from 'react'
import { useProgress } from '../store/progress'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Тема, которую задаёт внешняя оболочка через data-theme на <html>, если она есть. */
const hostTheme = (): 'light' | 'dark' | null => {
  const t = document.documentElement.dataset.theme
  return t === 'dark' || t === 'light' ? t : null
}

/** Применяет выбранную тему к <html> и возвращает итоговую: светлую или тёмную. */
export function useAppliedTheme(): 'light' | 'dark' {
  const theme = useProgress((s) => s.settings.theme)
  const [systemDark, setSystemDark] = useState(() => media().matches)
  const [host, setHost] = useState(hostTheme)
  useEffect(() => {
    const m = media()
    const on = () => setSystemDark(m.matches)
    m.addEventListener('change', on)
    const observer = new MutationObserver(() => setHost(hostTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      m.removeEventListener('change', on)
      observer.disconnect()
    }
  }, [])
  const resolved = theme === 'system' ? (host ?? (systemDark ? 'dark' : 'light')) : theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])
  return resolved
}
