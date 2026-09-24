import type { CategoryId, Level } from '../types'

/** Результат теста уровня. */
export interface Placement {
  level: Level
  at: number
  score: number[]
}

export type Placements = Partial<Record<CategoryId, Placement>>

/** Запись о задаче — та же, что в сторе прогресса. */
export interface TaskRecord {
  solved: boolean
  /** Решена с первой попытки и без подсказки. */
  firstTry: boolean
  revealed: boolean
  hinted: boolean
  attempts: number
  xp: number
  at: number
}

/** Всё, что относится к прогрессу и синхронизируется между устройствами (без настроек устройства). */
export interface ProgressPayload {
  records: Record<string, TaskRecord>
  xp: number
  days: Record<string, number>
  run: number
  bestRun: number
  /** Тест уровня по логике — поле из первой версии, его понимают старые версии сайта. */
  placement: Placement | null
  /** Тест уровня отдельно для каждого направления. */
  placements?: Placements
  seen: string[]
}

/** Из двух записей об одной задаче выбирает итоговую: решённая важнее нерешённой. */
function mergeRecord(a: TaskRecord, b: TaskRecord): TaskRecord {
  if (a.solved !== b.solved) return a.solved ? a : b
  if (a.solved) {
    // Обе решены: оставляем решение с бо́льшим опытом, при равенстве — более раннее.
    if (a.xp !== b.xp) return a.xp > b.xp ? a : b
    return a.at <= b.at ? a : b
  }
  return {
    solved: false,
    firstTry: false,
    revealed: a.revealed || b.revealed,
    hinted: a.hinted || b.hinted,
    attempts: Math.max(a.attempts, b.attempts),
    xp: 0,
    at: Math.max(a.at, b.at),
  }
}

/**
 * Объединяет прогресс двух устройств так, чтобы ничего не потерялось:
 * решённые задачи с обеих сторон сохраняются, опыт пересчитывается по ним,
 * у дней берётся бо́льшее число задач, отпечатки показанных задач — объединение.
 * Результат не зависит от того, сколько раз объединять одни и те же данные.
 */
export function mergeProgress(local: ProgressPayload, remote: Partial<ProgressPayload>): ProgressPayload {
  const records: Record<string, TaskRecord> = { ...local.records }
  for (const [id, rec] of Object.entries(remote.records ?? {})) {
    records[id] = records[id] ? mergeRecord(records[id], rec) : rec
  }
  const xp = Object.values(records).reduce((sum, r) => sum + (r.solved ? r.xp : 0), 0)

  const days = { ...local.days }
  for (const [day, n] of Object.entries(remote.days ?? {})) days[day] = Math.max(days[day] ?? 0, n)

  // По каждому направлению берём самый свежий тест; старое поле placement — это логика.
  const placements: Placements = {}
  const sources: (Placements | undefined)[] = [
    local.placements,
    remote.placements,
    local.placement ? { logic: local.placement } : undefined,
    remote.placement ? { logic: remote.placement } : undefined,
  ]
  for (const src of sources) {
    for (const [cat, p] of Object.entries(src ?? {}) as [CategoryId, Placement | undefined][]) {
      const cur = placements[cat]
      if (p && (!cur || p.at > cur.at)) placements[cat] = p
    }
  }

  const seenSet = new Set(local.seen)
  const seen = [...local.seen, ...(remote.seen ?? []).filter((k) => !seenSet.has(k))]

  return {
    records,
    xp,
    days,
    run: local.run,
    bestRun: Math.max(local.bestRun, remote.bestRun ?? 0),
    placement: placements.logic ?? null,
    placements,
    seen,
  }
}

/** Прогресс без изменчивых мелочей устройства — удобно сравнивать, изменилось ли что-то. */
export function sameProgress(a: ProgressPayload, b: ProgressPayload): boolean {
  return (
    a.xp === b.xp &&
    a.bestRun === b.bestRun &&
    a.seen.length === b.seen.length &&
    JSON.stringify(a.placement) === JSON.stringify(b.placement) &&
    JSON.stringify(a.placements ?? {}) === JSON.stringify(b.placements ?? {}) &&
    JSON.stringify(a.days) === JSON.stringify(b.days) &&
    JSON.stringify(a.records) === JSON.stringify(b.records)
  )
}
