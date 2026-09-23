import { ArrowRight, CircleCheck, CircleX, Dumbbell, Lock, RotateCcw, Shuffle, Zap } from 'lucide-react'
import { useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { LevelBadge, MODULE_ICONS, Page, ProgressBar } from '../components/ui'
import { LEVELS } from '../content/levels'
import { MODULE_BY_ID, MODULES } from '../content/modules'
import { tasksOf } from '../lib/catalog'
import { Link } from '../lib/router'
import { isUnlocked, useProgress } from '../store/progress'
import type { Level, ModuleId, Task } from '../types'

interface Result {
  task: Task
  correct: boolean
  clean: boolean
  xp: number
}

function shuffle<T>(items: T[]): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function Practice() {
  const state = useProgress()
  const [level, setLevel] = useState<Level>((state.placement?.level ?? 1) as Level)
  const [modules, setModules] = useState<ModuleId[]>(MODULES.map((m) => m.id))
  const [count, setCount] = useState(10)
  const [onlyNew, setOnlyNew] = useState(true)
  const [session, setSession] = useState<Task[] | null>(null)
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [answered, setAnswered] = useState(false)

  const available = modules.filter((m) => isUnlocked(state, m, level))
  const pool = available.flatMap((m) => tasksOf(m, level)).filter((t) => !onlyNew || !state.records[t.id]?.solved)

  const start = () => {
    setSession(shuffle(pool).slice(0, count))
    setPos(0)
    setResults([])
    setAnswered(false)
  }

  const toggle = (id: ModuleId) => setModules((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]))

  // ——— Итоги ———
  if (session && pos >= session.length) {
    const clean = results.filter((r) => r.clean).length
    const xp = results.reduce((s, r) => s + r.xp, 0)
    return (
      <Page className="max-w-3xl py-10">
        <p className="eyebrow">Тренировка завершена</p>
        <h1 className="h-display mt-2 text-3xl">
          {clean} из {session.length} с первой попытки
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-muted">
          <Zap size={16} className="text-warn" fill="currentColor" /> Получено {xp} XP
        </p>
        <div className="card mt-6 divide-y divide-line">
          {results.map((r, i) => (
            <Link key={r.task.id} to={`/task/${r.task.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
              {r.correct ? <CircleCheck size={20} className="shrink-0 text-good" /> : <CircleX size={20} className="shrink-0 text-bad" />}
              <span className="text-sm font-semibold">
                {i + 1}. {MODULE_BY_ID[r.task.module].title}
              </span>
              <span className="ml-auto text-xs text-muted">{r.clean ? 'с первой попытки' : r.correct ? 'с ошибками' : 'решение открыто'}</span>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={start} disabled={!pool.length}>
            <RotateCcw size={16} /> Ещё раз
          </button>
          <button className="btn-ghost" onClick={() => setSession(null)}>
            Изменить настройки
          </button>
        </div>
      </Page>
    )
  }

  // ——— Сессия ———
  if (session) {
    const task = session[pos]
    return (
      <Page className="max-w-3xl py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <button className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setSession(null)}>
            ← Завершить
          </button>
          <span className="text-sm font-bold">
            {pos + 1} / {session.length}
          </span>
        </div>
        <ProgressBar value={pos} max={session.length} className="mt-3" />
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <LevelBadge level={task.level} />
          <span className="chip">{MODULE_BY_ID[task.module].title}</span>
        </div>
        <div className="mt-4">
          <TaskCard
            key={task.id}
            task={task}
            autoFocus
            onResult={({ correct, xp }) => {
              const rec = useProgress.getState().records[task.id]
              setResults((rs) => [...rs, { task, correct, clean: correct && !!rec?.firstTry && xp > 0, xp }])
              setAnswered(true)
            }}
            after={
              <button
                className="btn-primary"
                onClick={() => {
                  setPos(pos + 1)
                  setAnswered(false)
                }}
              >
                {pos + 1 < session.length ? 'Дальше' : 'Итоги'} <ArrowRight size={16} />
              </button>
            }
          />
        </div>
        {!answered && (
          <div className="mt-4 text-right">
            <button
              className="text-sm font-semibold text-muted hover:text-ink"
              onClick={() => {
                setResults((rs) => [...rs, { task, correct: false, clean: false, xp: 0 }])
                setPos(pos + 1)
              }}
            >
              Пропустить →
            </button>
          </div>
        )}
      </Page>
    )
  }

  // ——— Настройка ———
  return (
    <Page className="max-w-4xl py-8 sm:py-10">
      <p className="eyebrow">Тренировка</p>
      <h1 className="h-display mt-2 text-2xl sm:text-3xl">Случайные задачи на выбор</h1>
      <p className="mt-2 text-muted">Соберите подборку: уровень, темы и количество задач. Опыт начисляется так же, как в курсе.</p>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-bold">Уровень</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`rounded-xl border px-3.5 py-2 text-sm font-bold transition ${
                level === l.id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${l.bg}`} />
              {l.id} · {l.name}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="font-bold">Темы</h2>
          <button className="text-sm font-semibold text-accent" onClick={() => setModules(modules.length === MODULES.length ? [] : MODULES.map((m) => m.id))}>
            {modules.length === MODULES.length ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODULES.map((m) => {
            const Icon = MODULE_ICONS[m.id]
            const on = modules.includes(m.id)
            const open = isUnlocked(state, m.id, level)
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  on ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'
                } ${open ? '' : 'opacity-60'}`}
                title={open ? undefined : 'Этот уровень темы ещё закрыт'}
              >
                {open ? <Icon size={16} className={on ? 'text-accent' : ''} /> : <Lock size={14} />}
                {m.title}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div>
            <h2 className="font-bold">Количество</h2>
            <div className="mt-3 flex gap-2">
              {[5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold ${count === n ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-8 flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Только нерешённые
          </label>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button className="btn-primary px-6 py-3" onClick={start} disabled={!pool.length}>
            <Shuffle size={17} /> Начать тренировку
          </button>
          <span className="text-sm text-muted">
            {pool.length ? `Доступно задач: ${pool.length}` : available.length ? 'Все задачи этого уровня уже решены.' : 'Выбранные темы на этом уровне закрыты.'}
          </span>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        <Dumbbell size={18} className="mt-0.5 shrink-0 text-accent" />
        Закрытые уровни открываются в курсе: решите половину задач предыдущего уровня темы или пройдите тест уровня.
      </div>
    </Page>
  )
}
