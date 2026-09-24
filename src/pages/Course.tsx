import { ArrowRight, CalendarDays, Flame, Gauge, Play, Smartphone, Sparkles, Zap } from 'lucide-react'
import { LevelBadge, ModuleIcon, Page, ProgressBar } from '../components/ui'
import { LEVELS, rankFor } from '../content/levels'
import { MODULE_BY_ID, MODULES } from '../content/modules'
import { TASK_BY_ID, TASKS, tasksOf } from '../lib/catalog'
import { streaks } from '../lib/dates'
import { Link } from '../lib/router'
import { useAuth } from '../store/auth'
import { dailyTask, isUnlocked, nextTaskIn, solvedCount, useProgress } from '../store/progress'

export function Course() {
  const state = useProgress()
  const authStatus = useAuth((s) => s.status)
  const { records, xp, placement, lastTaskId, days } = state
  const rank = rankFor(xp)
  const solved = solvedCount(records, TASKS)
  const streak = streaks(days)

  const last = lastTaskId ? TASK_BY_ID.get(lastTaskId) : undefined
  const continueTask = last ? (records[last.id]?.solved || records[last.id]?.revealed ? nextTaskIn(state, last.module) : last) : nextTaskIn(state, 'sequences')
  const daily = dailyTask()
  const dailyDone = records[daily.id]?.solved

  return (
    <Page className="py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Ваш курс</p>
          <h1 className="h-display mt-2 text-2xl sm:text-3xl">{solved === 0 ? 'Добро пожаловать!' : `Ранг: ${rank.current.name}`}</h1>
          <p className="mt-2 text-muted">
            {solved === 0
              ? 'Выберите тему или пройдите тест уровня — он откроет подходящие задания.'
              : `Решено ${solved} из ${TASKS.length} задач. ${rank.next ? `До ранга «${rank.next.name}» — ${rank.next.xp - xp} XP.` : 'Высший ранг достигнут!'}`}
          </p>
        </div>
        {placement ? <LevelBadge level={placement.level} /> : null}
      </div>

      {authStatus === 'signed-out' && solved > 0 && (
        <Link to="/account" className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm transition hover:border-accent/50">
          <Smartphone size={20} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <b className="font-bold">Сохраните прогресс в аккаунте</b>
            <span className="text-muted"> — и продолжайте с телефона или другого компьютера. Уже решённое не потеряется.</span>
          </span>
          <span className="font-bold text-accent">Войти →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Zap size={14} className="text-warn" fill="currentColor" /> Опыт
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold">{xp} XP</div>
          <ProgressBar value={rank.progress * 100} max={100} className="mt-3" />
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Flame size={14} className="text-bad" /> Серия дней
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold">{streak.current}</div>
          <p className="mt-2 text-xs text-muted">Лучшая серия: {streak.best}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">Решено задач</div>
          <div className="mt-1.5 font-display text-2xl font-semibold">
            {solved} <span className="text-base text-faint">/ {TASKS.length}</span>
          </div>
          <ProgressBar value={solved} max={TASKS.length} className="mt-3" color="bg-good" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {!placement && (
          <Link to="/test" className="card group flex min-w-0 items-center gap-4 p-5 transition hover:shadow-lift">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
              <Gauge size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Тест уровня</h2>
              <p className="text-sm text-muted">15 задач — и мы откроем подходящие уровни</p>
            </div>
            <ArrowRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
          </Link>
        )}
        {continueTask && (
          <Link to={`/task/${continueTask.id}`} className="card group flex min-w-0 items-center gap-4 p-5 transition hover:shadow-lift">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good">
              <Play size={20} fill="currentColor" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">{last ? 'Продолжить' : 'Начать с первой задачи'}</h2>
              <p className="truncate text-sm text-muted">
                {MODULE_BY_ID[continueTask.module].title} · уровень {continueTask.level}
              </p>
            </div>
            <ArrowRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
          </Link>
        )}
        <Link to="/daily" className="card group flex min-w-0 items-center gap-4 p-5 transition hover:shadow-lift">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn">
            <CalendarDays size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">Задача дня {dailyDone && <span className="text-good">✓</span>}</h2>
            <p className="truncate text-sm text-muted">
              {MODULE_BY_ID[daily.module].title} · уровень {daily.level}
            </p>
          </div>
          <ArrowRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
        </Link>
      </div>

      <Link
        to="/practice?gen=1&start=1"
        className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border border-accent/30 bg-accent-soft/60 p-5 transition hover:border-accent/60"
      >
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <Sparkles size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold">Новые задачи без конца</h2>
          <p className="text-sm text-muted">Задачи создаются автоматически на вашем уровне и никогда не повторяются — ни друг друга, ни задачи курса.</p>
        </div>
        <span className="btn-primary">
          Решать <ArrowRight size={16} />
        </span>
      </Link>

      <h2 className="h-display mt-12 text-xl">Темы курса</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const all = tasksOf(m.id)
          const done = solvedCount(records, all)
          return (
            <Link key={m.id} to={`/module/${m.id}`} className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="flex items-start gap-3">
                <ModuleIcon id={m.id} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold leading-snug">{m.title}</h3>
                  <p className="text-xs font-semibold text-faint">
                    {done} / {all.length} решено
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Прогресс по уровням">
                {LEVELS.map((l) => {
                  const list = tasksOf(m.id, l.id)
                  const pct = list.length ? solvedCount(records, list) / list.length : 0
                  const open = isUnlocked(state, m.id, l.id)
                  return (
                    <div key={l.id} title={`Уровень ${l.id}: ${Math.round(pct * 100)}%${open ? '' : ' (закрыт)'}`}>
                      <div className={`h-1.5 overflow-hidden rounded-full ${open ? 'bg-surface-2' : 'bg-surface-2 opacity-40'}`}>
                        <div className={`h-full rounded-full ${l.bg}`} style={{ width: `${pct * 100}%` }} />
                      </div>
                      <div className={`mt-1 text-center text-[10px] font-bold ${open ? l.text : 'text-faint'}`}>{l.id}</div>
                    </div>
                  )
                })}
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
