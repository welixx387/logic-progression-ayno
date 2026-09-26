import type { TaskDisplay as Display } from '../types'
import { delay, useAfterMount } from './Motion'

const isGap = (s: string) => s === '?' || s.endsWith('?')

/** Число в таблице — справа, подписи — слева. */
const isNumeric = (s: string) => /^[−-]?[\d\s.,]+%?$|^\d+ \/ \d+$/.test(s.trim())

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="inline-block min-w-full overflow-hidden rounded-2xl border border-line align-top sm:min-w-0">
      <table className="w-full border-collapse text-[15px]">
        <thead>
          <tr className="bg-surface-2">
            {head.map((h, j) => (
              <th key={j} className={`whitespace-nowrap px-3 py-2 text-xs font-bold text-muted sm:px-4 ${j === 0 ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="animate-fade-up border-t border-line" style={delay(i, 70)}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 sm:px-4 ${j === 0 ? 'whitespace-nowrap text-left font-semibold' : 'whitespace-nowrap text-right font-mono tabular-nums'} ${
                    j > 0 && !isNumeric(cell) ? 'font-sans' : ''
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Bars({ items, unit }: { items: { label: string; value: number }[]; unit?: string }) {
  const ready = useAfterMount(80)
  const max = Math.max(...items.map((i) => i.value))
  return (
    <div className="w-full max-w-xl space-y-1.5" role="img" aria-label={items.map((i) => `${i.label}: ${i.value}`).join(', ')}>
      {items.map((it, i) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-10 shrink-0 text-right text-sm font-semibold text-muted">{it.label}</span>
          <div className="h-7 flex-1 overflow-hidden rounded-lg bg-surface-2">
            <div
              className="flex h-full items-center justify-end rounded-lg bg-accent/75 pr-2 text-xs font-bold text-white transition-[width] duration-700 ease-out"
              style={{ width: `${ready ? Math.max(8, (it.value / max) * 100) : 0}%`, transitionDelay: `${i * 60}ms` }}
            />
          </div>
          <span className="w-12 shrink-0 font-mono text-sm font-semibold tabular-nums">{it.value}</span>
        </div>
      ))}
      {unit && <p className="pl-[3.25rem] text-xs text-faint">Единицы: {unit}</p>}
    </div>
  )
}

function Dialog({ lines }: { lines: { who: string; text: string }[] }) {
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="animate-fade-up" style={delay(i, 120)}>
          <p className="mb-1 text-xs font-bold text-muted">{l.who}</p>
          <p className="inline-block max-w-xl rounded-2xl rounded-tl-md border border-line bg-surface-2 px-4 py-3 text-[16px] leading-relaxed">{l.text}</p>
        </div>
      ))}
    </div>
  )
}

function Words({ items }: { items: string[] }) {
  return (
    <div className="flex max-w-2xl flex-wrap gap-2">
      {items.map((w, i) => (
        <span key={i} style={delay(i, 60)} className="animate-pop-in rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-[16px] font-semibold text-ink">
          {w}
        </span>
      ))}
    </div>
  )
}

/** Наглядная часть условия: ряд, таблица, диаграмма, диалог, текст или строки. */
export function TaskDisplay({ display }: { display: Display }) {
  if (display.type === 'memorize') {
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-muted">{display.title}</p>
        <TaskDisplay display={display.content} />
      </div>
    )
  }
  if (display.type === 'text') return <p className="max-w-2xl whitespace-pre-line rounded-2xl border border-line bg-surface-2 px-5 py-4 text-[16px] leading-relaxed">{display.text}</p>
  if (display.type === 'words') return <Words items={display.items} />
  if (display.type === 'table') return <Table head={display.head} rows={display.rows} />
  if (display.type === 'bars') return <Bars items={display.items} unit={display.unit} />
  if (display.type === 'dialog') return <Dialog lines={display.lines} />
  if (display.type === 'sequence') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {display.items.map((item, i) => (
          <span
            key={i}
            style={delay(i, 70)}
            className={`inline-flex h-12 min-w-12 items-center justify-center rounded-xl px-3 font-mono text-lg font-semibold sm:h-14 sm:min-w-14 sm:text-xl ${
              item === '?' ? 'animate-pop-pulse border-2 border-dashed border-accent bg-accent-soft text-accent' : 'animate-pop-in border border-line bg-surface-2 text-ink'
            }`}
          >
            {item}
          </span>
        ))}
      </div>
    )
  }
  if (display.type === 'grid') {
    // Клетки со словами (план города) шире и с обычным шрифтом.
    const words = display.rows.flat().some((c) => c.length > 3)
    return (
      <div className={`inline-grid ${words ? 'gap-1.5' : 'gap-2'}`} style={{ gridTemplateColumns: `repeat(${display.rows[0].length}, minmax(0, 1fr))` }}>
        {display.rows.flat().map((cell, i) => (
          <span
            key={i}
            style={delay(i, 45)}
            className={`flex items-center justify-center rounded-xl font-semibold ${
              words ? 'h-12 w-[4.5rem] px-1 text-center text-[11px] leading-tight sm:h-14 sm:w-24 sm:text-sm' : 'h-14 w-16 font-mono text-lg sm:h-16 sm:w-20 sm:text-xl'
            } ${
              cell === '?' ? 'animate-pop-pulse border-2 border-dashed border-accent bg-accent-soft text-accent' : 'animate-pop-in border border-line bg-surface-2'
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
        <span key={i} style={delay(i, 90)} className={`animate-fade-up font-mono text-lg font-semibold tracking-wide sm:text-xl ${isGap(line) ? 'text-accent' : 'text-ink'}`}>
          {line}
        </span>
      ))}
    </div>
  )
}
