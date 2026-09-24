import { ArrowLeft, BookOpen, Check, ChevronDown, Eye, Lock, Play, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { TaskDisplay } from '../components/TaskDisplay'
import { ModuleIcon, Page, ProgressBar } from '../components/ui'
import { LEVELS, levelInfo } from '../content/levels'
import { MODULE_BY_ID, type ModuleInfo } from '../content/modules'
import { tasksOf } from '../lib/catalog'
import { NO_GENERATOR } from '../lib/endless'
import { Link, navigate } from '../lib/router'
import { isUnlocked, solvedCount, statusOf, unlockNeed, useProgress, type TaskStatus } from '../store/progress'
import type { Level, ModuleId } from '../types'
import { NotFound } from './NotFound'

const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'

const TILE: Record<TaskStatus, string> = {
  new: 'border-line bg-surface text-ink hover:border-accent/60',
  tried: 'border-bad/60 bg-bad-soft text-bad',
  solved: 'border-good/50 bg-good-soft text-good',
  perfect: 'border-good bg-good text-white dark:text-[#0b1f14]',
  revealed: 'border-warn/60 bg-warn-soft text-warn',
}

function Theory({ m, defaultOpen }: { m: ModuleInfo; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [showExample, setShowExample] = useState(false)
  return (
    <section className="card mt-6 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 px-5 py-4 text-left sm:px-6" aria-expanded={open}>
        <BookOpen size={20} className="text-accent" />
        <span className="font-bold">Теория и приёмы</span>
        <span className="ml-auto text-sm font-semibold text-muted">{open ? 'Свернуть' : 'Развернуть'}</span>
        <ChevronDown size={18} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-rise border-t border-line px-5 pb-6 pt-5 sm:px-6">
          <p className="max-w-3xl leading-relaxed text-muted">{m.intro}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {m.sections.map((s, i) => (
              <div key={s.title} className="rounded-xl bg-surface-2 p-4">
                <h3 className="flex items-center gap-2 font-bold">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-accent-soft text-xs text-accent">{i + 1}</span>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">{s.body}</p>
              </div>
            ))}
          </div>
          {m.alphabet && (
            <div className="mt-5">
              <h3 className="text-sm font-bold text-muted">Номера букв</h3>
              <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                {ALPHABET.split('').map((ch, i) => (
                  <div key={ch} className="rounded-lg border border-line bg-surface px-1 py-1.5 text-center">
                    <div className="font-mono text-base font-semibold">{ch}</div>
                    <div className="text-[10px] font-bold text-faint">{i + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5 rounded-xl border border-accent/25 bg-accent-soft/50 p-4 sm:p-5">
            <p className="eyebrow">Разберём пример</p>
            <p className="mt-2 font-medium">{m.example.prompt}</p>
            {m.example.display && (
              <div className="mt-3 overflow-x-auto">
                <TaskDisplay display={m.example.display} />
              </div>
            )}
            {showExample ? (
              <p className="animate-rise mt-3 text-sm leading-relaxed">{m.example.solution}</p>
            ) : (
              <button type="button" className="btn-ghost mt-3" onClick={() => setShowExample(true)}>
                <Eye size={16} /> Показать решение
              </button>
            )}
          </div>
          <ul className="mt-5 space-y-1.5">
            {m.tips.map((t) => (
              <li key={t} className="flex gap-2 text-sm text-muted">
                <Check size={16} className="mt-0.5 shrink-0 text-good" /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export function ModulePage({ id, levelParam }: { id: string; levelParam: string | null }) {
  const state = useProgress()
  const m = MODULE_BY_ID[id as ModuleId]
  if (!m) return <NotFound />

  const all = tasksOf(m.id)
  const done = solvedCount(state.records, all)
  const firstOpen = ([...LEVELS].reverse().find((l) => isUnlocked(state, m.id, l.id))?.id ?? 1) as Level
  const level = (Number(levelParam) >= 1 && Number(levelParam) <= 5 ? Number(levelParam) : Math.min(firstOpen, state.placement?.level ?? firstOpen)) as Level
  const list = tasksOf(m.id, level)
  const unlocked = isUnlocked(state, m.id, level)
  const info = levelInfo(level)
  const next = list.find((t) => !state.records[t.id]?.solved && !state.records[t.id]?.revealed) ?? list[0]
  const solvedHere = solvedCount(state.records, list)

  return (
    <Page className="py-8 sm:py-10">
      <Link to="/course" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Все темы
      </Link>
      <div className="mt-4 flex flex-wrap items-start gap-4">
        <ModuleIcon id={m.id} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="h-display text-2xl sm:text-3xl">{m.title}</h1>
          <p className="mt-1.5 text-muted">{m.short}</p>
          <div className="mt-3 flex max-w-md items-center gap-3">
            <ProgressBar value={done} max={all.length} className="flex-1" color="bg-good" />
            <span className="text-sm font-semibold text-muted">
              {done} / {all.length}
            </span>
          </div>
        </div>
      </div>

      <Theory m={m} defaultOpen={done === 0} />

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Уровни">
        {LEVELS.map((l) => {
          const open = isUnlocked(state, m.id, l.id)
          const active = l.id === level
          const count = tasksOf(m.id, l.id)
          return (
            <button
              key={l.id}
              role="tab"
              aria-selected={active}
              onClick={() => navigate(`/module/${m.id}?l=${l.id}`, true)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition ${
                active ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {open ? <span className={`h-2 w-2 rounded-full ${l.bg}`} /> : <Lock size={14} />}
              Уровень {l.id}
              <span className="text-xs font-semibold text-faint">
                {solvedCount(state.records, count)}/{count.length}
              </span>
            </button>
          )
        })}
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={`font-display text-lg font-semibold ${info.text}`}>
              Уровень {info.id} · {info.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{info.description}</p>
          </div>
          {unlocked && (
            <div className="flex flex-wrap gap-2">
              {!NO_GENERATOR.includes(m.id) && (
                <Link to={`/practice?gen=1&m=${m.id}&l=${level}&start=1`} className="btn-ghost" title="Задачи создаются автоматически и не повторяются">
                  <Sparkles size={16} className="text-accent" /> Новые задачи
                </Link>
              )}
              {next && (
                <Link to={`/task/${next.id}`} className="btn-primary">
                  <Play size={16} fill="currentColor" /> {solvedHere === 0 ? 'Начать' : solvedHere === list.length ? 'Повторить' : 'Продолжить'}
                </Link>
              )}
            </div>
          )}
        </div>

        {unlocked ? (
          <>
            <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-12">
              {list.map((t, i) => {
                const status = statusOf(state.records[t.id])
                return (
                  <Link
                    key={t.id}
                    to={`/task/${t.id}`}
                    className={`flex aspect-square items-center justify-center rounded-xl border text-sm font-bold transition hover:-translate-y-0.5 ${TILE[status]}`}
                    title={{ new: 'Не решена', tried: 'Есть ошибки', solved: 'Решена', perfect: 'Решена с первой попытки', revealed: 'Решение открыто' }[status]}
                  >
                    {i + 1}
                  </Link>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-good" /> с первой попытки
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-good/50 bg-good-soft" /> решена
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-warn/60 bg-warn-soft" /> решение открыто
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-bad/60 bg-bad-soft" /> есть ошибки
              </span>
            </div>
          </>
        ) : (
          <div className="mt-5 flex flex-col items-start gap-4 rounded-xl bg-surface-2 p-5 sm:flex-row sm:items-center">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-muted">
              <Lock size={20} />
            </span>
            <div className="flex-1">
              <p className="font-bold">Уровень пока закрыт</p>
              <p className="mt-1 text-sm text-muted">
                Решите {unlockNeed(m.id, level)} из {tasksOf(m.id, (level - 1) as Level).length} задач уровня {level - 1} (сейчас{' '}
                {solvedCount(state.records, tasksOf(m.id, (level - 1) as Level))}) или пройдите тест уровня.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/module/${m.id}?l=${level - 1}`} className="btn-ghost">
                К уровню {level - 1}
              </Link>
              <Link to="/test" className="btn-primary">
                Тест уровня
              </Link>
            </div>
          </div>
        )}
      </div>
    </Page>
  )
}
