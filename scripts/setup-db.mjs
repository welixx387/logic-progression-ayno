/**
 * Готовит базу для аккаунтов при сборке на Vercel.
 *
 * Если к проекту в Vercel подключена база Supabase (Storage → Supabase),
 * Vercel передаёт строку подключения в POSTGRES_URL_NON_POOLING. Тогда этот
 * скрипт применяет supabase/schema.sql: создаёт таблицу прогресса, правила
 * доступа и включает мгновенные обновления. Скрипт можно запускать сколько
 * угодно раз. Без базы или при ошибке он ничего не ломает — сборка идёт дальше.
 */
import { readFileSync } from 'node:fs'

const raw = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL
if (!raw) {
  console.log('setup-db: база не подключена — пропускаем')
  process.exit(0)
}

let pg
try {
  pg = (await import('pg')).default
} catch {
  console.log('setup-db: пакет pg не установлен — пропускаем')
  process.exit(0)
}

// sslmode из строки подключения заменяем явной настройкой: Supabase требует шифрование.
const url = new URL(raw)
url.searchParams.delete('sslmode')
const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 })

try {
  await client.connect()
  await client.query(readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'))
  console.log('setup-db: таблица logic_progress готова')
} catch (e) {
  console.warn(`setup-db: не удалось подготовить базу (${e.message}). Выполните supabase/schema.sql вручную в SQL Editor.`)
} finally {
  await client.end().catch(() => undefined)
}
