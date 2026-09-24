import { useEffect, useState, type AnchorHTMLAttributes } from 'react'

/** Простой роутер на hash — работает на любом статическом хостинге без настроек. */

export interface Route {
  path: string
  query: URLSearchParams
}

function read(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, search = ''] = raw.split('?')
  return { path: path || '/', query: new URLSearchParams(search) }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    let path = read().path
    const onChange = () => {
      const next = read()
      setRoute(next)
      // Прокручиваем наверх только при переходе на другую страницу,
      // а не при смене вкладки или уровня на той же странице.
      if (next.path !== path) window.scrollTo({ top: 0 })
      path = next.path
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

export function navigate(to: string, replace = false) {
  const hash = `#${to}`
  if (replace) {
    window.history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = to
  }
}

export function Link({ to, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return <a href={`#${to}`} {...rest} />
}

/** Сопоставляет путь с шаблоном вида /module/:id. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/')
  const s = path.split('/')
  if (p.length !== s.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(s[i])
    else if (p[i] !== s[i]) return null
  }
  return params
}
