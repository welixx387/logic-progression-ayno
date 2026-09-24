import { Trophy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Burst } from './Motion'

type Listener = (rank: string) => void
const listeners = new Set<Listener>()

/** Сообщить о новом ранге — всплывёт уведомление с праздником. */
export function announceRank(rank: string) {
  listeners.forEach((l) => l(rank))
}

const SHOW_MS = 4500

export function RankToast() {
  const [rank, setRank] = useState<{ name: string; id: number } | null>(null)

  useEffect(() => {
    const onRank: Listener = (name) => setRank({ name, id: Date.now() })
    listeners.add(onRank)
    return () => {
      listeners.delete(onRank)
    }
  }, [])

  useEffect(() => {
    if (!rank) return
    const t = setTimeout(() => setRank(null), SHOW_MS)
    return () => clearTimeout(t)
  }, [rank])

  if (!rank) return null
  return (
    <div
      key={rank.id}
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-[calc(4.75rem+env(safe-area-inset-top))] z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-toast-in"
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-warn/40 bg-surface p-4 shadow-lift">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-warn-soft via-transparent to-accent-soft opacity-80" />
        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
          <Trophy size={22} className="animate-flicker" />
          <Burst count={12} spread={46} />
        </span>
        <div className="relative min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-warn">Новый ранг!</p>
          <p className="truncate font-display text-lg font-semibold text-ink">{rank.name}</p>
        </div>
        <button type="button" onClick={() => setRank(null)} className="relative rounded-lg p-1 text-muted hover:text-ink" aria-label="Закрыть">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
