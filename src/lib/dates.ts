/** Дата в формате YYYY-MM-DD по местному времени. */
export function dayKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Текущая и лучшая серии дней подряд с решёнными задачами. */
export function streaks(days: Record<string, number>) {
  const active = (d: Date) => (days[dayKey(d)] ?? 0) > 0
  const today = new Date()
  let current = 0
  let cursor = active(today) ? today : addDays(today, -1)
  while (active(cursor)) {
    current++
    cursor = addDays(cursor, -1)
  }
  const keys = Object.keys(days)
    .filter((k) => days[k] > 0)
    .sort()
  let best = 0
  let run = 0
  let prev: string | null = null
  for (const k of keys) {
    run = prev && dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) === k ? run + 1 : 1
    best = Math.max(best, run)
    prev = k
  }
  return { current, best: Math.max(best, current) }
}
