import type { ProgressPayload } from './merge'
import { supabase } from './supabase'

/**
 * Прогресс пользователя хранится одним JSON-документом в таблице
 * public.logic_progress — одна строка на пользователя (см. supabase/schema.sql).
 */
const TABLE = 'logic_progress'

export async function pullProgress(userId: string): Promise<Partial<ProgressPayload> | null> {
  const { data, error } = await supabase!.from(TABLE).select('data').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return (data?.data as Partial<ProgressPayload> | undefined) ?? null
}

export async function pushProgress(userId: string, payload: ProgressPayload): Promise<void> {
  const { error } = await supabase!
    .from(TABLE)
    .upsert({ user_id: userId, data: payload, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Подписка на изменения строки пользователя — например, решённые задачи с телефона. */
export function subscribeProgress(userId: string, onChange: (payload: Partial<ProgressPayload>) => void): () => void {
  const channel = supabase!
    .channel(`logic_progress:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` }, (change) => {
      const row = change.new as { data?: Partial<ProgressPayload> } | null
      if (row?.data) onChange(row.data)
    })
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}
