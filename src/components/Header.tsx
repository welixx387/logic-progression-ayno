import { ChartColumn, CloudOff, LogIn, Moon, Sun, Zap, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { CATEGORIES, isCategory } from '../content/categories'
import { MODULE_BY_ID } from '../content/modules'
import { TASK_BY_ID } from '../lib/catalog'
import { Link, match } from '../lib/router'
import { isCloudConfigured } from '../lib/supabase'
import { displayName, useAuth } from '../store/auth'
import { useProgress } from '../store/progress'
import type { CategoryId, ModuleId } from '../types'
import { Logo } from './Logo'
import { useCountUp } from './Motion'
import { CATEGORY_ICONS } from './ui'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Направление — для цвета активного пункта. */
  category?: CategoryId
}

export const NAV: NavItem[] = [
  ...CATEGORIES.map((c) => ({ to: `/c/${c.id}`, label: c.tab, icon: CATEGORY_ICONS[c.id], category: c.id })),
  { to: '/progress', label: 'Прогресс', icon: ChartColumn },
]

/** К какому направлению относится страница: сама страница направления, тема или задача. */
function categoryOfPath(path: string): CategoryId | null {
  const c = match('/c/:id', path) ?? match('/c/:id/:section', path)
  if (c && isCategory(c.id)) return c.id
  const m = match('/module/:id', path)
  if (m && m.id in MODULE_BY_ID) return MODULE_BY_ID[m.id as ModuleId].category
  const t = match('/task/:id', path)
  const task = t && TASK_BY_ID.get(t.id)
  return task ? MODULE_BY_ID[task.module].category : null
}

const isActive = (path: string, item: NavItem) => (item.category ? categoryOfPath(path) === item.category : path === item.to || (item.to === '/progress' && path === '/account'))

const activeClass = (item: NavItem) => (item.category ? `${CATEGORIES.find((c) => c.id === item.category)!.soft} ${CATEGORIES.find((c) => c.id === item.category)!.text}` : 'bg-accent-soft text-accent')
const activeText = (item: NavItem) => (item.category ? CATEGORIES.find((c) => c.id === item.category)!.text : 'text-accent')

export function Header({ path, theme }: { path: string; theme: 'light' | 'dark' }) {
  const xp = useProgress((s) => s.xp)
  const setTheme = useProgress((s) => s.setTheme)
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="min-w-0 rounded-lg" aria-label="На главную">
          <Logo />
        </Link>
        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
          {NAV.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition duration-200 ${
                  isActive(path, item) ? activeClass(item) : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <Icon size={16} className="hidden xl:block" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link to="/progress" className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink sm:inline-flex" title="Опыт">
            <Zap key={xp} size={14} className="animate-pop-in text-warn" fill="currentColor" />
            <XpCount xp={xp} /> XP
          </Link>
          <AccountButton />
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface text-muted transition hover:text-ink"
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </header>
  )
}

/** Опыт в шапке: при новом решении число плавно дорастает до нового значения. */
function XpCount({ xp }: { xp: number }) {
  const [from] = useState(xp)
  return <span className="tabular-nums">{useCountUp(xp, { from, duration: 700 })}</span>
}

/** Кнопка аккаунта: «Войти» или буква имени; с ошибкой синхронизации — значок. */
function AccountButton() {
  const status = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const syncStatus = useAuth((s) => s.syncStatus)
  if (isCloudConfigured && status === 'authed') {
    const name = displayName(user)
    return (
      <Link to="/account" className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-1 text-xs font-bold sm:pr-3" title="Аккаунт">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[13px] text-accent-ink">{name.charAt(0).toUpperCase()}</span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{name}</span>
        {syncStatus === 'error' && <CloudOff size={14} className="text-bad" aria-label="Нет связи с сервером" />}
      </Link>
    )
  }
  return (
    <Link to="/account" className="btn-primary h-9 w-9 px-0 py-0 sm:w-auto sm:px-3.5 sm:text-sm" aria-label="Войти" title="Войти или зарегистрироваться">
      <LogIn size={16} />
      <span className="hidden sm:inline">Войти</span>
    </Link>
  )
}

export function MobileNav({ path }: { path: string }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Навигация"
    >
      <div className="grid grid-cols-5">
        {NAV.map((item) => {
          const { to, label, icon: Icon } = item
          const active = isActive(path, item)
          return (
            <Link key={to} to={to} className={`relative flex min-w-0 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${active ? activeText(item) : 'text-muted'}`}>
              <span className={`absolute top-0 h-0.5 rounded-full bg-current transition-all duration-300 ${active ? 'w-8 opacity-100' : 'w-0 opacity-0'}`} />
              <Icon size={20} strokeWidth={active ? 2.4 : 2} className={`transition-transform duration-300 ${active ? '-translate-y-0.5 scale-110' : ''}`} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo compact />
        <p>{isCloudConfigured ? 'Онлайн-курс развития мышления · войдите, чтобы прогресс был на всех устройствах' : 'Онлайн-курс развития мышления · прогресс хранится в вашем браузере'}</p>
      </div>
    </footer>
  )
}
