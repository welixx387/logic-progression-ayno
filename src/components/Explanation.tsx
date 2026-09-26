import { BookOpen, Check, CircleCheck, KeyRound, ListChecks, ListOrdered, Sparkles, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { isGradeCategory } from '../content/categories'
import { MODULE_BY_ID } from '../content/modules'
import { NO_GENERATOR } from '../lib/endless'
import { Link } from '../lib/router'
import type { Task } from '../types'
import { delay } from './Motion'
import { TaskDisplay } from './TaskDisplay'

/** Сокращения, после точки в которых предложение не заканчивается. */
const ABBR = new Set(['т', 'е', 'д', 'п', 'г', 'гг', 'в', 'вв', 'см', 'им', 'ул', 'др', 'стр', 'руб', 'тыс', 'млн', 'млрд', 'мин', 'сек', 'ч', 'н', 'у', 'ок', 'напр', 'т.е'])

/**
 * Делит разбор на шаги: по строкам, а если строка одна — по предложениям
 * (не разрывая инициалы «В. И.» и сокращения «т. е.», «г.»).
 */
export function splitSteps(text: string): string[] {
  const lines = text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  if (lines.length !== 1) return lines
  const t = lines[0]
  const out: string[] = []
  const re = /([.!?…])\s+(?=[А-ЯЁA-Z0-9«(−])/g
  let start = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(t))) {
    const piece = t.slice(start, m.index + 1)
    const word = /([\p{L}\d]+)[.!?…]$/u.exec(piece)?.[1] ?? ''
    if (m[1] === '.' && ((word.length < 3 && !/^\d+$/.test(word)) || ABBR.has(word.toLowerCase()))) continue
    out.push(piece.trim())
    start = re.lastIndex
  }
  out.push(t.slice(start).trim())
  return out.filter(Boolean)
}

/** Определение понятия из словаря темы: точное совпадение или без учёта регистра. */
function lookup(glossary: Record<string, string>, term: string): string | undefined {
  if (glossary[term]) return glossary[term]
  const lower = term.toLowerCase()
  const key = Object.keys(glossary).find((k) => k.toLowerCase() === lower)
  return key ? glossary[key] : undefined
}

function Block({ icon, title, children, i }: { icon: ReactNode; title: string; children: ReactNode; i: number }) {
  return (
    <section className="animate-fade-up" style={delay(i, 80)}>
      <h4 className="flex items-center gap-2 text-sm font-bold text-ink">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-accent">{icon}</span>
        {title}
      </h4>
      <div className="mt-2 pl-8 text-[15px] leading-relaxed text-ink/90">{children}</div>
    </section>
  )
}

/**
 * Подробный разбор задачи: что было показано (в заданиях на память), ключевая
 * идея, решение по шагам, разбор вариантов, правило из теории и куда идти дальше.
 */
export function Explanation({ task, similar = true }: { task: Task; similar?: boolean }) {
  const m = MODULE_BY_ID[task.module]
  const steps = splitSteps(task.solution)
  const memo = task.display?.type === 'memorize' ? task.display : null
  const notes =
    task.kind === 'choice'
      ? (task.options ?? []).map((o) => ({ option: o, correct: o === task.answer, note: task.notes?.[o] ?? lookup(m.glossary ?? {}, o) }))
      : []
  const showNotes = notes.some((n) => n.note && !n.correct) || notes.filter((n) => n.note).length >= 2
  // Школьные предметы: раздел теории — программа класса задачи; в остальных темах — раздел, указанный в задаче.
  const section = isGradeCategory(m.category) ? m.sections[task.level - 1] : task.ref !== undefined ? m.sections[task.ref] : undefined
  let i = 0

  return (
    <div className="mt-3 space-y-5">
      {memo && (
        <Block icon={<Sparkles size={14} />} title="Что нужно было запомнить" i={i++}>
          <div className="overflow-x-auto pb-1">
            <TaskDisplay display={memo.content} />
          </div>
        </Block>
      )}

      {task.hint && (
        <Block icon={<KeyRound size={14} />} title="Ключ к решению" i={i++}>
          <p>{task.hint}</p>
        </Block>
      )}

      <Block icon={<ListOrdered size={14} />} title={steps.length > 1 ? 'Решение по шагам' : 'Решение'} i={i++}>
        {steps.length > 1 ? (
          <ol className="space-y-2">
            {steps.map((s, k) => (
              <li key={k} className="flex gap-2.5">
                <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-surface px-1 text-[11px] font-bold text-muted">{k + 1}</span>
                <span className="min-w-0 whitespace-pre-line">{s}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="whitespace-pre-line">{task.solution}</p>
        )}
      </Block>

      {showNotes && (
        <Block icon={<ListChecks size={14} />} title="Разбор вариантов" i={i++}>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.option} className={`rounded-xl border px-3 py-2 ${n.correct ? 'border-good/40 bg-good-soft/60' : 'border-line bg-surface'}`}>
                <span className="flex items-start gap-2 font-semibold">
                  {n.correct ? <CircleCheck size={16} className="mt-1 shrink-0 text-good" /> : <X size={16} className="mt-1 shrink-0 text-bad" />}
                  <span className="min-w-0 break-words">{n.option}</span>
                </span>
                {n.note && <span className="mt-0.5 block pl-6 text-sm text-muted">{n.note}</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {section ? (
        <Block icon={<BookOpen size={14} />} title={`Правило: ${section.title}`} i={i++}>
          <p>{section.body}</p>
        </Block>
      ) : (
        m.tips.length > 0 && (
          <Block icon={<BookOpen size={14} />} title="Приёмы для таких задач" i={i++}>
            <ul className="space-y-1">
              {m.tips.map((t) => (
                <li key={t} className="flex gap-2">
                  <Check size={16} className="mt-1 shrink-0 text-good" /> {t}
                </li>
              ))}
            </ul>
          </Block>
        )
      )}

      {similar && (
        <div className="flex flex-wrap gap-2 pl-8">
          {!NO_GENERATOR.includes(task.module) && (
            <Link to={`/c/${m.category}/practice?gen=1&m=${task.module}&l=${task.level}&start=1`} className="btn-ghost">
              <Sparkles size={16} className="text-accent" /> Похожая задача
            </Link>
          )}
          <Link to={`/module/${task.module}?l=${task.level}`} className="btn-quiet">
            <BookOpen size={16} /> Теория темы
          </Link>
        </div>
      )}
    </div>
  )
}
