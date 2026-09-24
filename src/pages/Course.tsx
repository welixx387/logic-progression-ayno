import { ArrowRight, CalendarDays, Flame, Play, Smartphone, Zap } from 'lucide-react'
import { Cascade, CountUp, delay, riseOn } from '../components/Motion'
import { CategoryIcon, LevelBadge, Page, ProgressBar } from '../components/ui'
import { CATEGORIES, isGradeCategory } from '../content/categories'
import { rankFor } from '../content/levels'
import { MODULE_BY_ID, modulesOf } from '../content/modules'
import { TASK_BY_ID, TASKS } from '../lib/catalog'
import { streaks } from '../lib/dates'
import { Link } from '../lib/router'
import { allCategoryStats } from '../lib/stats'
import { useAuth } from '../store/auth'
import { plural } from '../generators/util'
import { dailyTask, nextTaskIn, solvedCount, useProgress } from '../store/progress'

/** Общая страница курса: сводка и выбор направления. Всё остальное — на страницах направлений. */
export function Course() {
  const state = useProgress()
  const authStatus = useAuth((s) => s.status)
  const { records, xp, placements, lastTaskId, days } = state
  const rank = rankFor(xp)
  const solved = solvedCount(records, TASKS)
  const streak = streaks(days)
  const stats = allCategoryStats(records)

  const last = lastTaskId ? TASK_BY_ID.get(lastTaskId) : undefined
  const continueTask = last ? (records[last.id]?.solved || records[last.id]?.revealed ? nextTaskIn(state, last.module) : last) : null
  const daily = dailyTask()
  const dailyDone = records[daily.id]?.solved

  return (
    <Page className="py-8 sm:py-10">
      <p className="eyebrow">Ваш курс</p>
      <h1 className="h-display mt-2 text-2xl sm:text-3xl">{solved === 0 ? 'Добро пожаловать!' : `Ранг: ${rank.current.name}`}</h1>
      <p className="mt-2 text-muted">
        {solved === 0
          ? 'Выберите направление — у каждого свои темы, тренировка и статистика. В «Школе» — предметы 7–11 классов.'
          : `Решено ${solved} из ${TASKS.length} задач. ${rank.next ? `До ранга «${rank.next.name}» — ${rank.next.xp - xp} XP.` : 'Высший ранг достигнут!'}`}
      </p>

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

      {/* Направления */}
      <Cascade className="mt-6 grid gap-4 md:grid-cols-2">
        {(shown) =>
          CATEGORIES.map((c, i) => {
            const s = stats[c.id]
            const placement = placements[c.id]
            return (
              <Link
                key={c.id}
                to={`/c/${c.id}`}
                className={`group relative flex flex-col overflow-hidden rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-6 ${c.border} ${c.soft} ${riseOn(shown)}`}
                style={delay(i, 90)}
              >
                <div className={`pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full opacity-30 blur-3xl transition duration-500 group-hover:scale-125 ${c.bg}`} />
                <div className="relative flex items-start gap-4">
                  <CategoryIcon id={c.id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold">{c.title}</h2>
                    <p className="mt-1 text-sm text-muted">{c.short}</p>
                  </div>
                  <ArrowRight size={20} className={`mt-1 shrink-0 transition group-hover:translate-x-1 ${c.text}`} />
                </div>
                <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface/70 px-2 py-2.5">
                    <div className="font-display text-lg font-semibold">{s.solved + s.solvedNew}</div>
                    <div className="text-[11px] font-semibold text-muted">решено</div>
                  </div>
                  <div className="rounded-xl bg-surface/70 px-2 py-2.5">
                    <div className="font-display text-lg font-semibold">{s.xp}</div>
                    <div className="text-[11px] font-semibold text-muted">XP</div>
                  </div>
                  <div className="rounded-xl bg-surface/70 px-2 py-2.5">
                    <div className="font-display text-lg font-semibold">{s.finished ? `${s.accuracy}%` : '—'}</div>
                    <div className="text-[11px] font-semibold text-muted">с 1-й попытки</div>
                  </div>
                </div>
                <div className="relative mt-4 flex items-center gap-3">
                  <ProgressBar value={s.solved} max={s.total} className="flex-1" color={c.bg} />
                  <span className="shrink-0 text-xs font-semibold text-muted">
                    {s.solved} / {s.total}
                  </span>
                </div>
                <div className="relative mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {isGradeCategory(c.id) ? (
                    <span>{state.settings.grade ? `${state.settings.grade} класс` : 'Класс не выбран'}</span>
                  ) : placement ? (
                    <LevelBadge level={placement.level} />
                  ) : (
                    <span>Тест уровня не пройден</span>
                  )}
                  <span>
                    · {modulesOf(c.id).length}{' '}
                    {isGradeCategory(c.id)
                      ? plural(modulesOf(c.id).length, 'предмет', 'предмета', 'предметов')
                      : plural(modulesOf(c.id).length, 'тема', 'темы', 'тем')}
                  </span>
                </div>
              </Link>
            )
          })
        }
      </Cascade>

      {/* Общая сводка */}
      <h2 className="h-display mt-10 text-xl">Сводка</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
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

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {continueTask && (
          <Link to={`/task/${continueTask.id}`} className="card group flex min-w-0 items-center gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-good-soft text-good transition duration-300 group-hover:scale-110">
              <Play size={20} fill="currentColor" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold">Продолжить</h3>
              <p className="truncate text-sm text-muted">
                {MODULE_BY_ID[continueTask.module].title} · уровень {continueTask.level}
              </p>
            </div>
            <ArrowRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
          </Link>
        )}
        <Link to="/daily" className="card group flex min-w-0 items-center gap-4 p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warn-soft text-warn transition duration-300 group-hover:scale-110">
            <CalendarDays size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold">Задача дня {dailyDone && <span className="text-good">✓</span>}</h3>
            <p className="truncate text-sm text-muted">
              {MODULE_BY_ID[daily.module].title} · уровень {daily.level}
            </p>
          </div>
          <ArrowRight size={18} className="text-muted transition group-hover:translate-x-0.5" />
        </Link>
      </div>
    </Page>
  )
}
