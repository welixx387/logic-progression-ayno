import type { TaskDisplay as Display } from '../types'

const isGap = (s: string) => s === '?' || s.endsWith('?')

/** Наглядная часть условия: ряд, таблица или строки. */
export function TaskDisplay({ display }: { display: Display }) {
  if (display.type === 'sequence') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {display.items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-3 font-mono text-lg font-semibold sm:h-14 sm:min-w-14 sm:text-xl ${
              item === '?' ? 'border-2 border-dashed border-accent bg-accent-soft text-accent' : 'border border-line bg-surface-2 text-ink'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    )
  }
  if (display.type === 'grid') {
    return (
      <div className="inline-grid gap-2" style={{ gridTemplateColumns: `repeat(${display.rows[0].length}, minmax(0, 1fr))` }}>
        {display.rows.flat().map((cell, i) => (
          <span
            key={i}
            className={`flex h-14 w-16 items-center justify-center rounded-xl font-mono text-lg font-semibold sm:h-16 sm:w-20 sm:text-xl ${
              cell === '?' ? 'border-2 border-dashed border-accent bg-accent-soft text-accent' : 'border border-line bg-surface-2'
            }`}
          >
            {cell}
          </span>
        ))}
      </div>
    )
  }
  return (
    <div className="inline-flex flex-col gap-2 rounded-2xl border border-line bg-surface-2 px-5 py-4">
      {display.lines.map((line, i) => (
        <span key={i} className={`font-mono text-lg font-semibold tracking-wide sm:text-xl ${isGap(line) ? 'text-accent' : 'text-ink'}`}>
          {line}
        </span>
      ))}
    </div>
  )
}
