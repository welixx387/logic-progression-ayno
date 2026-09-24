import { ArrowRight, CircleCheck, CircleX, Dumbbell, Infinity as InfinityIcon, Loader2, Lock, RotateCcw, Shuffle, Sparkles, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { LevelBadge, MODULE_ICONS, Page, ProgressBar } from '../components/ui'
import { LEVELS } from '../content/levels'
import { MODULE_BY_ID, MODULES } from '../content/modules'
import { tasksOf } from '../lib/catalog'
import { generateTask, NO_GENERATOR } from '../lib/endless'
import { Link } from '../lib/router'
import { isUnlocked, useProgress } from '../store/progress'
import type { Level, ModuleId, Task } from '../types'

type Source = 'new' | 'course'

interface Result {
  task: Task
  correct: boolean
  clean: boolean
  xp: number
}

interface Session {
  source: Source
  modules: ModuleId[]
  level: Level
  /** Сколько задач в подборке; null — без ограничения. */
  limit: number | null
  tasks: Task[]
}

function shuffle<T>(items: T[]): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const isModule = (m: string): m is ModuleId => MODULES.some((x) => x.id === m)

export function Practice({ query }: { query: URLSearchParams }) {
  const state = useProgress()
  const markSeen = useProgress((s) => s.markSeen)

  // Настройки можно передать ссылкой: /practice?gen=1&m=sequences&l=2&start=1
  const preModules = (query.get('m') ?? '').split(',').filter(isModule)
  const preLevel = Number(query.get('l'))
  const [source, setSource] = useState<Source>(query.get('gen') === '0' ? 'course' : 'new')
  const [level, setLevel] = useState<Level>((preLevel >= 1 && preLevel <= 5 ? preLevel : state.placement?.level ?? 1) as Level)
  const [modules, setModules] = useState<ModuleId[]>(preModules.length ? preModules : MODULES.map((m) => m.id))
  const [count, setCount] = useState<number | null>(source === 'new' ? null : 10)
  const [onlyNew, setOnlyNew] = useState(true)

  const [session, setSession] = useState<Session | null>(null)
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [answered, setAnswered] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [finished, setFinished] = useState(false)
  const autoStarted = useRef(false)

  const usable = (src: Source) =>
    modules.filter((m) => isUnlocked(state, m, level) && (src === 'course' || !NO_GENERATOR.includes(m)))
  const coursePool = usable('course')
    .flatMap((m) => tasksOf(m, level))
    .filter((t) => !onlyNew || !state.records[t.id]?.solved)

  /** Создаёт следующее задание для сессии «новые задачи». */
  const inFlight = useRef(false)
  const fetchNext = useCallback(async (s: Session) => {
    // Не просим вторую задачу, пока не пришла первая, — иначе они могли бы совпасть.
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    const seen = [...useProgress.getState().seen, ...s.tasks.map((t) => t.key!).filter(Boolean)]
    const reply = await generateTask(s.modules, s.level, seen)
    inFlight.current = false
    setLoading(false)
    if (!reply.task) {
      setExhausted(true)
      return
    }
    const task = reply.task
    markSeen(task.key!)
    setSession((cur) => (cur && cur === s ? { ...cur, tasks: [...cur.tasks, task] } : cur))
  }, [markSeen])

  const start = (src: Source = source) => {
    const mods = usable(src)
    const s: Session =
      src === 'course'
        ? { source: src, modules: mods, level, limit: count, tasks: shuffle(coursePool).slice(0, count ?? coursePool.length) }
        : { source: src, modules: mods, level, limit: count, tasks: [] }
    setSession(s)
    setPos(0)
    setResults([])
    setAnswered(false)
    setExhausted(false)
    setFinished(false)
    if (src === 'new') fetchNext(s)
  }

  // Запуск сразу по ссылке из темы.
  useEffect(() => {
    if (query.get('start') === '1' && !autoStarted.current) {
      autoStarted.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const next = () => {
    if (!session) return
    const nextPos = pos + 1
    setAnswered(false)
    if (session.limit !== null && nextPos >= session.limit) {
      setFinished(true)
      return
    }
    setPos(nextPos)
    if (session.source === 'new' && nextPos >= session.tasks.length) fetchNext(session)
    if (session.source === 'course' && nextPos >= session.tasks.length) setFinished(true)
  }

  const toggle = (id: ModuleId) => setModules((ms) => (ms.includes(id) ? ms.filter((x) => x !== id) : [...ms, id]))

  // ——— Итоги ———
  if (session && finished) {
    const clean = results.filter((r) => r.clean).length
    const xp = results.reduce((s, r) => s + r.xp, 0)
    return (
      <Page className="max-w-3xl py-10">
        <p className="eyebrow">Тренировка завершена</p>
        <h1 className="h-display mt-2 text-3xl">
          {clean} из {results.length} с первой попытки
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-muted">
          <Zap size={16} className="text-warn" fill="currentColor" /> Получено {xp} XP
        </p>
        {results.length > 0 && (
          <div className="card mt-6 divide-y divide-line">
            {results.map((r, i) => {
              const row = (
                <>
                  {r.correct ? <CircleCheck size={20} className="shrink-0 text-good" /> : <CircleX size={20} className="shrink-0 text-bad" />}
                  <span className="text-sm font-semibold">
                    {i + 1}. {MODULE_BY_ID[r.task.module].title}
                  </span>
                  <span className="ml-auto text-xs text-muted">{r.clean ? 'с первой попытки' : r.correct ? 'с ошибками' : 'не решена'}</span>
                </>
              )
              return r.task.id.startsWith('g-') ? (
                <div key={r.task.id} className="flex items-center gap-3 px-5 py-3.5">
                  {row}
                </div>
              ) : (
                <Link key={r.task.id} to={`/task/${r.task.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2">
                  {row}
                </Link>
              )
            })}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={() => start(session.source)}>
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
    const task = session.tasks[pos]
    const total = session.limit
    return (
      <Page className="max-w-3xl py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <button className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setFinished(true)}>
            ← Завершить
          </button>
          <span className="flex items-center gap-1.5 text-sm font-bold">
            {session.source === 'new' && <Sparkles size={15} className="text-accent" />}
            {total ? `${pos + 1} / ${total}` : `Задача ${pos + 1}`}
          </span>
        </div>
        {total ? <ProgressBar value={pos} max={total} className="mt-3" /> : <div className="mt-3 h-2 rounded-full bg-accent-soft" />}

        {task ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <LevelBadge level={task.level} />
              <span className="chip">{MODULE_BY_ID[task.module].title}</span>
              {session.source === 'new' && <span className="chip text-accent">новая задача</span>}
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
                  // Пока человек читает разбор, готовим следующую задачу.
                  if (session.source === 'new' && pos + 1 >= session.tasks.length && (total === null || pos + 1 < total)) fetchNext(session)
                }}
                after={
                  <button className="btn-primary" onClick={next} disabled={session.source === 'new' && loading && pos + 1 >= session.tasks.length}>
                    {total !== null && pos + 1 >= total ? 'Итоги' : 'Дальше'} <ArrowRight size={16} />
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
                    next()
                  }}
                >
                  Пропустить →
                </button>
              </div>
            )}
          </>
        ) : exhausted ? (
          <div className="card mt-6 p-6 text-center">
            <p className="font-bold">Новые задачи этого типа закончились</p>
            <p className="mt-1 text-sm text-muted">
              Вы увидели все варианты, которые умеет создавать генератор для выбранных тем на уровне {session.level}. Выберите другой уровень или другие темы.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button className="btn-primary" onClick={() => setSession(null)}>
                Выбрать уровень и темы
              </button>
              <button className="btn-ghost" onClick={() => setFinished(true)}>
                К итогам
              </button>
            </div>
          </div>
        ) : (
          <div className="card mt-6 flex items-center justify-center gap-3 p-10 text-muted">
            <Loader2 size={20} className="animate-spin text-accent" /> Создаём новую задачу…
          </div>
        )}
      </Page>
    )
  }

  // ——— Настройка ———
  const available = usable(source)
  const canStart = source === 'new' ? available.length > 0 : coursePool.length > 0
  return (
    <Page className="max-w-4xl py-8 sm:py-10">
      <p className="eyebrow">Тренировка</p>
      <h1 className="h-display mt-2 text-2xl sm:text-3xl">Решайте сколько хотите</h1>
      <p className="mt-2 text-muted">Выберите уровень и темы. Опыт начисляется так же, как в курсе.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Откуда брать задачи">
        {(
          [
            ['new', 'Новые задачи', 'Создаются прямо сейчас и никогда не повторяются — ни друг друга, ни задачи курса.', Sparkles],
            ['course', 'Задачи из курса', 'Случайная подборка из заданий курса. Удобно, чтобы повторить пройденное.', Dumbbell],
          ] as [Source, string, string, typeof Sparkles][]
        ).map(([value, title, text, Icon]) => (
          <button
            key={value}
            role="radio"
            aria-checked={source === value}
            onClick={() => {
              setSource(value)
              setCount(value === 'new' ? null : 10)
            }}
            className={`card flex gap-3 p-4 text-left transition ${source === value ? 'border-accent ring-2 ring-accent/25' : 'hover:border-accent/40'}`}
          >
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${source === value ? 'bg-accent text-accent-ink' : 'bg-accent-soft text-accent'}`}>
              <Icon size={19} />
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="mt-0.5 block text-sm text-muted">{text}</span>
            </span>
          </button>
        ))}
      </div>

      <section className="card mt-4 p-5 sm:p-6">
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
            const handmade = source === 'new' && NO_GENERATOR.includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  on ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-muted'
                } ${open && !handmade ? '' : 'opacity-50'}`}
                title={!open ? 'Этот уровень темы ещё закрыт' : handmade ? 'Эти задачи написаны вручную и есть только в курсе' : undefined}
              >
                {open ? <Icon size={16} className={on ? 'text-accent' : ''} /> : <Lock size={14} />}
                {m.title}
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-6">
          <div>
            <h2 className="font-bold">Количество</h2>
            <div className="mt-3 flex gap-2">
              {[5, 10, 20, ...(source === 'new' ? [null] : [])].map((n) => (
                <button
                  key={String(n)}
                  onClick={() => setCount(n)}
                  className={`inline-flex items-center rounded-xl border px-4 py-2 text-sm font-bold ${count === n ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-surface text-muted'}`}
                  aria-label={n === null ? 'Без ограничения' : undefined}
                  title={n === null ? 'Без ограничения — решайте, пока не надоест' : undefined}
                >
                  {n === null ? <InfinityIcon size={18} /> : n}
                </button>
              ))}
            </div>
          </div>
          {source === 'course' && (
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-semibold">
              <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
              Только нерешённые
            </label>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-line pt-5">
          <button className="btn-primary px-6 py-3" onClick={() => start()} disabled={!canStart}>
            {source === 'new' ? <Sparkles size={17} /> : <Shuffle size={17} />} Начать тренировку
          </button>
          <span className="text-sm text-muted">
            {source === 'new'
              ? available.length
                ? `Тем: ${available.length}. Уже показано новых задач: ${state.seen.length}.`
                : 'Выбранные темы на этом уровне закрыты.'
              : coursePool.length
                ? `Доступно задач: ${coursePool.length}`
                : 'Все задачи этого уровня уже решены — попробуйте «Новые задачи».'}
          </span>
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        <Lock size={18} className="mt-0.5 shrink-0 text-accent" />
        Закрытые уровни открываются в курсе: решите половину задач предыдущего уровня темы или пройдите тест уровня.
      </div>
    </Page>
  )
}
