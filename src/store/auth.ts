import type { User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { flushCloudSync, stopCloudSync } from '../lib/cloudSync'
import { navigate } from '../lib/router'
import { isCloudConfigured, siteUrl, supabase } from '../lib/supabase'
import { useProgress } from './progress'

/** off — аккаунты не настроены; loading — проверяем сохранённый вход. */
export type AuthStatus = 'off' | 'loading' | 'signed-out' | 'authed'
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

type Result = { error: string | null }

const ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'Неверный email или пароль.'],
  [/user already registered|already been registered/i, 'Этот email уже зарегистрирован — войдите.'],
  [/email not confirmed/i, 'Email ещё не подтверждён — откройте письмо и нажмите ссылку в нём.'],
  [/password should be at least/i, 'Пароль должен быть не короче 6 символов.'],
  [/unable to validate email|invalid format|email address .* is invalid/i, 'Проверьте email — похоже, в нём опечатка.'],
  [/rate limit|too many requests/i, 'Слишком много попыток. Подождите минуту и попробуйте снова.'],
  [/for security purposes/i, 'Повторно отправить письмо можно чуть позже — через минуту.'],
  [/should be different from the old password/i, 'Новый пароль должен отличаться от старого.'],
  [/auth session missing|jwt expired/i, 'Сессия истекла — войдите заново.'],
  [/email address not authorized|error sending/i, 'Письмо не отправлено: на сайте ещё не настроена почта. Если забыли пароль, напишите владельцу сайта.'],
  [/fetch|network|failed to/i, 'Нет связи с сервером. Проверьте интернет и попробуйте снова.'],
]

export function translateError(message: string): string {
  return ERRORS.find(([re]) => re.test(message))?.[1] ?? message
}

interface AuthState {
  status: AuthStatus
  user: User | null
  syncStatus: SyncStatus
  lastSyncedAt: number | null
  /** Пользователь пришёл по ссылке «сбросить пароль» и должен задать новый. */
  recovery: boolean

  init: () => void
  signIn: (email: string, password: string) => Promise<Result>
  signUp: (name: string, email: string, password: string) => Promise<Result & { needsConfirm: boolean }>
  signOut: () => Promise<void>
  sendReset: (email: string) => Promise<Result>
  setNewPassword: (password: string) => Promise<Result>
  updateName: (name: string) => Promise<Result>
  setSync: (status: SyncStatus) => void
}

let initialized = false

export const useAuth = create<AuthState>()((set, get) => ({
  status: isCloudConfigured ? 'loading' : 'off',
  user: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  recovery: false,

  init: () => {
    if (!supabase || initialized) return
    initialized = true
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        set({ recovery: true })
        navigate('/account')
      }
      set(session ? { status: 'authed', user: session.user } : { status: 'signed-out', user: null, syncStatus: 'idle' })
    })
    supabase.auth.getSession().then(({ data }) => {
      if (get().status === 'loading') set(data.session ? { status: 'authed', user: data.session.user } : { status: 'signed-out' })
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password })
    return { error: error ? translateError(error.message) : null }
  },

  signUp: async (name, email, password) => {
    // Сначала — через сервер сайта: аккаунт создаётся сразу подтверждённым, письмо не нужно.
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      if (res.ok) {
        const { error } = await get().signIn(email, password)
        return { error, needsConfirm: false }
      }
      // 404/405/501 — функции нет или она не настроена: регистрируемся обычным способом.
      if (![404, 405, 501].includes(res.status)) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        if (body.error) return { error: translateError(body.error), needsConfirm: false }
      }
    } catch {
      // Сеть или статический хостинг — пробуем обычную регистрацию.
    }
    const { data, error } = await supabase!.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: name.trim() || undefined }, emailRedirectTo: siteUrl() },
    })
    if (error) return { error: translateError(error.message), needsConfirm: false }
    // Если в проекте включено подтверждение email, сессии пока нет — нужно открыть письмо.
    return { error: null, needsConfirm: !data.session }
  },

  signOut: async () => {
    // Сначала досохраняем последние изменения, потом выходим и очищаем устройство.
    await flushCloudSync().catch(() => undefined)
    stopCloudSync()
    await supabase!.auth.signOut()
    useProgress.getState().reset()
    set({ status: 'signed-out', user: null, syncStatus: 'idle', lastSyncedAt: null, recovery: false })
  },

  sendReset: async (email) => {
    const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: siteUrl() })
    return { error: error ? translateError(error.message) : null }
  },

  setNewPassword: async (password) => {
    const { error } = await supabase!.auth.updateUser({ password })
    if (!error) set({ recovery: false })
    return { error: error ? translateError(error.message) : null }
  },

  updateName: async (name) => {
    const { data, error } = await supabase!.auth.updateUser({ data: { username: name.trim() } })
    if (!error && data.user) set({ user: data.user })
    return { error: error ? translateError(error.message) : null }
  },

  setSync: (syncStatus) => set(syncStatus === 'synced' ? { syncStatus, lastSyncedAt: Date.now() } : { syncStatus }),
}))

/** Как обращаться к пользователю: имя из профиля или начало email. */
export function displayName(user: User | null): string {
  const name = (user?.user_metadata?.username as string | undefined)?.trim()
  return name || user?.email?.split('@')[0] || ''
}
