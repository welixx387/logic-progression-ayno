import { ArrowRight, CalendarDays, Flame, Gauge, Play, Smartphone, Sparkles, Zap } from 'lucide-react'
import { CategoryTabs } from '../components/CategoryTabs'
import { Cascade, CountUp, delay, riseOn, useAfterMount } from '../components/Motion'
import { CategoryIcon, LevelBadge, ModuleIcon, Page, ProgressBar } from '../components/ui'
import { CATEGORY_BY_ID, isCategory } from '../content/categories'
import { LEVELS, rankFor } from '../content/levels'
import { MODULE_BY_ID, modulesOf } from '../content/modules'
import { TASK_BY_ID, TASKS, tasksOf } from '../lib/catalog'
import { streaks } from '../lib/dates'
import { NO_GENERATOR } from '../lib/endless'
import { Link, navigate } from '../lib/router'
import { useAuth } from '../store/auth'
import { categoryOf, dailyTask, isUnlocked, nextTaskIn, solvedCount, useProgress } from '../store/progress'
import type { CategoryId } from '../types'

export function Course({ categoryParam }: { categoryParam: string | null }) {
  const state = useProgress()
  const authStatus = useAuth((s) => s.status)
  const { records, xp, placements, lastTaskId, days } = state
  const rank = rankFor(xp)
  const solved = solvedCount(records, TASKS)
  const streak = streaks(days)

  const last = lastTaskId ? TASK_BY_ID.get(lastTaskId) : undefined
  // Без явного выбора открываем направление, в котором человек занимался последним.
  const category: CategoryId = isCategory(categoryParam) ? categoryParam : last ? categoryOf(last.module) : 'logic'
  const cat = CATEGORY_BY_ID[category]
  const modules = modulesOf(category)
  const placement = placements[category]
  const catTasks = modules.flatMap((m) => tasksOf(m.id))
  const catSolved = solvedCount(records, catTasks)
  const withGenerator = modules.filter((m) => !NO_GENERATOR.includes(m.id))

  const continueTask = last ? (records[last.id]?.solved || records[last.id]?.revealed ? nextTaskIn(state, last.module) : last) : nextTaskIn(state, modules[0].id)
  const daily = dailyTask()
  const dailyDone = records[daily.id]?.solved
  const ready = useAfterMount()

  const choose = (c: CategoryId) => navigate(`/course?c=${c}`, true)

  return (
    <Page className="py-8 sm:py-10">
      <div>
        <p className="eyebrow">Ваш курс</p>
        <h1 className="h-display mt-2 text-2xl sm:text-3xl">{solved === 0 ? 'Добро пожаловать!' : `Ранг: ${rank.current.name}`}</h1>
        <p className="mt-2 text-muted">
          {solved === 0
            ? 'Выберите направление и тему или пройдите тест уровня — он откроет подходящие задания.'
            : `Решено ${solved} из ${TASKS.length} задач. ${rank.next ? `До ранга «${rank.next.name}» — ${rank.next.xp - xp} XP.` : 'Высший ранг достигнут!'}`}
        </p>
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
        <div className="card animate-fade-up p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Zap size={14} className="text-warn" fill="currentColor" /> Опыт
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold">
            <CountUp value={xp} suffix=" XP" />
          </div>
          <ProgressBar value={rank.progress * 100} max={100} className="mt-3" />
        </div>
        <div className="card animate-fade-up p-4" style={delay(1)}>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Flame size={14} className={`text-bad ${streak.current > 0 ? 'animate-flicker' : ''}`} /> Серия дней
          </div>
          <div className="mt-1.5 font-display text-2xl font-semibold">
            <CountUp value={streak.current} />
          </div>
          <p className="mt-2 text-xs text-muted">Лучшая серия: {streak.best}</p>
        </div>
        <div className="card animate-fade-up p-4" style={delay(2)}>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">Решено задач</div>
          <div className="mt-1.5 font-display text-2xl font-semibold">
            <CountUp value={solved} /> <span className="text-base text-faint">/ {TASKS.length}</span>
          </div>
          <ProgressBar value={solved} max={TASKS.length} className="mt-3" color="bg-good" />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {continueTask && (
          <Link
            to={`/task/${continueTask.id}`}
            className="card group flex min-w-0 animate-fade-up items-center gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
            style={delay(3)}
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good transition duration-300 group-hover:scale-110">
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
        <Link
          to="/daily"
          className="card group flex min-w-0 animate-fade-up items-center gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift"
          style={delay(4)}
        >
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn transition duration-300 group-hover:scale-110">
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

      {/* Направления */}
      <h2 className="h-display mt-12 text-xl">Направления</h2>
      <div className="mt-4 animate-fade-up" style={delay(5)}>
        <CategoryTabs value={category} onChange={choose} />
      </div>

      <div key={category} className="animate-fade-up">
        <div className={`mt-4 flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${cat.border} ${cat.soft}`}>
          <CategoryIcon id={category} size="lg" />
          <div className="min-w-0 flex-1 basis-60">
            <h3 className="font-display text-lg font-semibold">{cat.title}</h3>
            <p className="mt-1 text-sm text-muted">{cat.description}</p>
            <div className="mt-3 flex max-w-sm items-center gap-3">
              <ProgressBar value={catSolved} max={catTasks.length} className="flex-1" color={cat.bg} />
              <span className="shrink-0 text-xs font-semibold text-muted">
                {catSolved} / {catTasks.length}
              </span>
            </div>
          </div>
          {placement ? (
            <LevelBadge level={placement.level} />
          ) : (
            <Link to={`/test?c=${category}`} className="btn-ghost">
              <Gauge size={16} className={cat.text} /> Тест уровня
            </Link>
          )}
        </div>

        {withGenerator.length > 0 && (
          <div className="relative mt-3 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-5">
            <div className={`pointer-events-none absolute -right-10 -top-16 h-40 w-40 animate-float rounded-full blur-2xl ${cat.soft}`} />
            <span className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${cat.bg}`}>
              <Sparkles size={20} className="animate-flicker" />
            </span>
            <div className="relative min-w-0 flex-1 basis-60">
              <h3 className="font-bold">Новые задачи без конца</h3>
              <p className="text-sm text-muted">Выберите уровень — задачи по темам направления создаются автоматически и не повторяются.</p>
            </div>
            <div className="relative flex flex-wrap gap-2" aria-label="Уровень новых задач">
              {LEVELS.map((l, i) => (
                <Link
                  key={l.id}
                  to={`/practice?gen=1&c=${category}&l=${l.id}&start=1`}
                  title={`Уровень ${l.id} · ${l.name}`}
                  style={delay(i + 2, 70)}
                  className={`inline-flex h-11 w-11 animate-pop-in items-center justify-center rounded-xl font-display text-base font-semibold text-white transition hover:-translate-y-1 hover:scale-105 hover:shadow-lift active:scale-95 ${l.bg}`}
                >
                  {l.id}
                </Link>
              ))}
            </div>
          </div>
        )}

        <h3 className="h-display mt-8 text-lg">
          Темы <span className={cat.text}>· {cat.tab}</span>
        </h3>
        <Cascade className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(shown) =>
            modules.map((m, i) => {
              const all = tasksOf(m.id)
              const done = solvedCount(records, all)
              return (
                <Link
                  key={m.id}
                  to={`/module/${m.id}`}
                  className={`card group flex flex-col p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${riseOn(shown)}`}
                  style={delay(i, 45)}
                >
                  <div className="flex items-start gap-3">
                    <ModuleIcon id={m.id} />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold leading-snug">{m.title}</h4>
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
                            <div
                              className={`h-full rounded-full transition-[width] duration-1000 ease-out ${l.bg}`}
                              style={{ width: `${ready && shown ? pct * 100 : 0}%`, transitionDelay: `${i * 45 + l.id * 60}ms` }}
                            />
                          </div>
                          <div className={`mt-1 text-center text-[10px] font-bold ${open ? l.text : 'text-faint'}`}>{l.id}</div>
                        </div>
                      )
                    })}
                  </div>
                </Link>
              )
            })
          }
        </Cascade>
      </div>
    </Page>
  )
}
