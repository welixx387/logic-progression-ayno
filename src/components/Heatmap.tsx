import { addDays, dayKey } from '../lib/dates'
import { delay } from './Motion'

export const WEEKS = 16
const WEEKDAYS = ['пн', '', 'ср', '', 'пт', '', '']
const ACCENT: [string, string, string] = ['bg-accent/35', 'bg-accent/65', 'bg-accent']

/** Карта активности: сколько задач решено в каждый из последних WEEKS недель. */
export function Heatmap({ days, tones = ACCENT }: { days: Record<string, number>; tones?: [string, string, string] }) {
  const today = new Date()
  // Начинаем с понедельника недели, которая была WEEKS − 1 недель назад.
  const shift = (today.getDay() + 6) % 7
  const start = addDays(today, -shift - (WEEKS - 1) * 7)
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  const max = Math.max(1, ...Object.values(days))
  const tone = (n: number) => (n === 0 ? 'bg-surface-2' : n / max < 0.34 ? tones[0] : n / max < 0.67 ? tones[1] : tones[2])
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] font-semibold text-faint">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="h-3.5 leading-[14px]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((d, i) => {
          const key = dayKey(d)
          const n = days[key] ?? 0
          const future = d > today
          // Клетки проявляются неделя за неделей, слева направо.
          return (
            <span
              key={key}
              title={`${d.toLocaleDateString('ru-RU')}: ${n} задач`}
              className={`h-3.5 w-3.5 rounded-[4px] ${future ? 'opacity-0' : `animate-pop-in transition hover:scale-125 ${tone(n)}`}`}
              style={future ? undefined : delay(Math.floor(i / 7) + (i % 7) / 3, 35)}
            />
          )
        })}
      </div>
    </div>
  )
}
