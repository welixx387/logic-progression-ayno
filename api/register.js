/**
 * Регистрация через сервер сайта (Vercel Function).
 *
 * Встроенная почта Supabase отправляет письма только участникам команды
 * проекта, поэтому обычный signUp с подтверждением email у посетителей не
 * сработает без своего почтового сервера. Здесь аккаунт создаётся сразу
 * подтверждённым — сервисным ключом, который есть только на сервере (его
 * добавляет интеграция Supabase в Vercel). Сайт сначала пробует этот путь,
 * а если функции нет (другой хостинг), регистрируется обычным способом.
 */
import { createClient } from '@supabase/supabase-js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  // Нет ключей — пусть сайт зарегистрирует обычным способом.
  if (!url || !key) return res.status(501).json({ error: 'not configured' })

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  const name = String(body?.name ?? '').trim().slice(0, 40)
  if (!EMAIL.test(email) || email.length > 200) return res.status(400).json({ error: 'Unable to validate email address: invalid format' })
  if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'Password should be at least 6 characters' })

  const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { username: name } : {},
  })
  if (error) return res.status(error.status === 422 || /already/i.test(error.message) ? 409 : 400).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
