import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Аккаунты необязательны. Если ключи Supabase не заданы (см. .env.example),
 * сайт работает как раньше: прогресс хранится только в браузере, кнопки
 * входа не показываются.
 */
export const isCloudConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isCloudConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // PKCE кладёт код из письма в ?code=…, а не в #…, — так он не мешает адресам страниц вида #/course.
        flowType: 'pkce',
        storageKey: 'logic-progression-ayno-auth',
      },
    })
  : null

/** Адрес сайта без #-части — сюда ведут ссылки из писем. */
export function siteUrl() {
  return `${window.location.origin}${window.location.pathname}`
}
