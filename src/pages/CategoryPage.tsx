import { ArrowLeft, ArrowRight, Award, CalendarDays, CalendarCheck, Dumbbell, Gauge, Lock, Play, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { Heatmap, WEEKS } from '../components/Heatmap'
import { Cascade, CountUp, delay, riseOn, useAfterMount } from '../components/Motion'
import { CategoryIcon, LevelBadge, ModuleIcon, Page, ProgressBar, Stat } from '../components/ui'
import { CATEGORY_BY_ID, isGradeCategory } from '../content/categories'
import { gradeOf, LEVELS, levelLabel, levelShort } from '../content/levels'
import { MODULE_BY_ID, modulesOf } from '../content/modules'
import { TASK_BY_ID, tasksOf } from '../lib/catalog'
import { NO_GENERATOR } from '../lib/endless'
import { Link } from '../lib/router'
import { categoryStats, tasksOfCategory } from '../lib/stats'
import { categoryAchievements, categoryOf, dailyTask, isUnlocked, nextTaskIn, solvedCount, useProgress, type TaskRecord } from '../store/progress'
import type { CategoryId } from '../types'

/** Страница одного направления: свои темы, тренировка, тест, задача дня и статистика. */
export function CategoryPage({ category }: { category: CategoryId }) {
  const state = useProgress()
  const { records, lastTaskId } = state
  const cat = CATEGORY_BY_ID[category]
  const modules = modulesOf(category)
  const stats = categoryStats(records, category)
  const placement = state.placements[category]
  const achs = categoryAchievements(state, category, stats)
  const ready = useAfterMount()
  const base = `/c/${category}`
  // Школьные предметы: вместо теста уровня ученик выбирает свой класс.
  const grades = isGradeCategory(category)
  const grade = state.settings.grade
  const setGrade = useProgress((s) => s.setGrade)

  const last = lastTaskId ? TASK_BY_ID.get(lastTaskId) : undefined
  const lastHere = last && categoryOf(last.module) === category ? last : undefined
  const finished = (r: TaskRecord | undefined) => !!r && (r.solved || r.revealed)
  const continueTask = lastHere
    ? finished(records[lastHere.id])
      ? nextTaskIn(state, lastHere.module)
      : lastHere
    : modules.map((m) => nextTaskIn(state, m.id)).find(Boolean) ?? null
  const daily = dailyTask(new Date(), category, grade)
  const dailyDone = !!records[daily.id]?.solved
  const withGenerator = modules.some((m) => !NO_GENERATOR.includes(m.id))
  const lastDate = stats.lastAt ? new Date(stats.lastAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : null

  return (
    <Page className="py-6 sm:py-10">
      <Link to="/course" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> Все направления
      </Link>

      {/* Шапка направления */}
      <section className={`relative mt-4 overflow-hidden rounded-3xl border p-5 sm:p-8 ${cat.border} ${cat.soft}`}>
        <div className={`pointer-events-none absolute -right-16 -top-20 h-64 w-64 animate-float rounded-full opacity-40 blur-3xl ${cat.bg}`} />
        <div className="relative flex flex-wrap items-start gap-4 sm:gap-5">
          <span className="animate-pop-in">
            <CategoryIcon id={category} size="lg" />
          </span>
          <div className="min-w-0 flex-1 basis-64 animate-fade-up">
            <p className={`text-xs font-bold uppercase tracking-[0.14em] ${cat.text}`}>Направление</p>
            <h1 className="h-display mt-1 text-2xl sm:text-3xl">{cat.title}</h1>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted">{cat.description}</p>
          </div>
          {grades ? (
            <div className="w-full animate-fade-up sm:w-auto" style={delay(1)}>
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${cat.text}`}>{grade ? 'Ваш класс' : 'Выберите класс'}</p>
              <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label="Ваш класс">
                {LEVELS.map((l) => {
                  const g = gradeOf(l.id)
                  const on = grade === g
                  return (
                    <button
                      key={l.id}
                      role="radio"
                      aria-checked={on}
                      title={levelLabel(l.id, true)}
                      onClick={() => setGrade(g)}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border font-display text-base font-semibold transition duration-200 hover:-translate-y-0.5 active:scale-95 ${
                        on ? `border-transparent text-white shadow-lift ${cat.bg}` : 'border-line bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="animate-fade-up" style={delay(1)}>
              {placement ? (
                <LevelBadge level={placement.level} />
              ) : (
                <span className="chip">
                  <Gauge size={13} /> Уровень не определён
                </span>
              )}
            </div>
          )}
        </div>
        <div className="relative mt-6 flex flex-wrap gap-2 sm:gap-3">
          {continueTask && (
            <Link to={`/task/${continueTask.id}`} className={`btn group text-white shadow-lift hover:brightness-110 ${cat.bg}`}>
              <Play size={16} fill="currentColor" /> {lastHere ? 'Продолжить' : 'Начать'}
              <span className="hidden font-medium opacity-90 sm:inline">
                · {MODULE_BY_ID[continueTask.module].title}, {grades ? levelShort(continueTask.level, true) : `ур. ${continueTask.level}`}
              </span>
            </Link>
          )}
          <Link to={`${base}/practice`} className="btn-ghost">
            <Dumbbell size={16} className={cat.text} /> Тренировка
          </Link>
          {!grades && (
            <Link to={`${base}/test`} className="btn-ghost">
              <Gauge size={16} className={cat.text} /> {placement ? 'Пройти тест заново' : 'Тест уровня'}
            </Link>
          )}
          <Link to={`${base}/daily`} className="btn-ghost">
            <CalendarDays size={16} className="text-warn" /> Задача дня {dailyDone && <span className="text-good">✓</span>}
          </Link>
        </div>
      </section>

      {/* Статистика направления */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Опыт в направлении" value={<CountUp value={stats.xp} suffix=" XP" />} icon={<Zap size={14} className="text-warn" fill="currentColor" />} hint="за решённые задачи" />
        <Stat
          label="Решено задач"
          value={
            <>
              <CountUp value={stats.solved} /> <span className="text-base text-faint">/ {stats.total}</span>
            </>
          }
          icon={<Target size={14} className="text-good" />}
          hint={stats.solvedNew ? `и ещё ${stats.solvedNew} новых` : 'задач курса'}
        />
        <Stat label="С первой попытки" value={<CountUp value={stats.accuracy} suffix="%" />} icon={<Award size={14} className={cat.text} />} hint={`из ${stats.finished} завершённых`} />
        <Stat
          label="Дней занятий"
          value={<CountUp value={Object.keys(stats.days).length} />}
          icon={<CalendarCheck size={14} className={cat.text} />}
          hint={lastDate ? `последний раз ${lastDate}` : 'ещё не начинали'}
        />
      </div>

      {withGenerator && (
        <div className="relative mt-4 flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-5">
          <span className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${cat.bg}`}>
            <Sparkles size={20} className="animate-flicker" />
          </span>
          <div className="relative min-w-0 flex-1 basis-60">
            <h2 className="font-bold">Новые задачи без конца</h2>
            <p className="text-sm text-muted">
              {grades
                ? 'Выберите класс — задачи по всем предметам создаются автоматически и не повторяются.'
                : 'Выберите уровень — задачи по темам направления создаются автоматически и не повторяются.'}
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2" aria-label={grades ? 'Класс новых задач' : 'Уровень новых задач'}>
            {LEVELS.map((l, i) => (
              <Link
                key={l.id}
                to={`${base}/practice?gen=1&l=${l.id}&start=1`}
                title={levelLabel(l.id, grades)}
                style={delay(i + 2, 70)}
                className={`inline-flex h-11 w-11 animate-pop-in items-center justify-center rounded-xl font-display text-base font-semibold text-white transition hover:-translate-y-1 hover:scale-105 hover:shadow-lift active:scale-95 ${l.bg} ${
                  grades && grade === gradeOf(l.id) ? 'ring-2 ring-ink/70 ring-offset-2 ring-offset-surface' : ''
                }`}
              >
                {grades ? gradeOf(l.id) : l.id}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Темы */}
      <h2 className="h-display mt-10 text-xl">{grades ? 'Предметы' : 'Темы'}</h2>
      {grades && (
        <p className="mt-1 text-sm text-muted">
          {grade ? `Задачи и теория откроются на программе ${grade} класса; другие классы — во вкладках внутри предмета.` : 'Выберите класс вверху — задачи откроются на программе вашего класса.'}
        </p>
      )}
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
                style={delay(i, 60)}
              >
                <div className="flex items-start gap-3">
                  <ModuleIcon id={m.id} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold leading-snug">{m.title}</h3>
                    <p className="text-xs font-semibold text-faint">
                      {done} / {all.length} решено
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{m.short}</p>
                <div className="mt-auto grid grid-cols-5 gap-1.5 pt-4" aria-label="Прогресс по уровням">
                  {LEVELS.map((l) => {
                    const list = tasksOf(m.id, l.id)
                    const pct = list.length ? solvedCount(records, list) / list.length : 0
                    const open = isUnlocked(state, m.id, l.id)
                    return (
                      <div key={l.id} title={`${grades ? levelLabel(l.id, true) : `Уровень ${l.id}`}: ${Math.round(pct * 100)}%${open ? '' : ' (закрыт)'}`}>
                        <div className={`h-1.5 overflow-hidden rounded-full ${open ? 'bg-surface-2' : 'bg-surface-2 opacity-40'}`}>
                          <div
                            className={`h-full rounded-full transition-[width] duration-1000 ease-out ${l.bg}`}
                            style={{ width: `${ready && shown ? pct * 100 : 0}%`, transitionDelay: `${i * 60 + l.id * 60}ms` }}
                          />
                        </div>
                        <div className={`mt-1 flex items-center justify-center text-[10px] font-bold ${open ? l.text : 'text-faint'} ${grades && grade === gradeOf(l.id) ? 'underline underline-offset-2' : ''}`}>
                          {open ? (grades ? gradeOf(l.id) : l.id) : <Lock size={9} />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Link>
            )
          })
        }
      </Cascade>

      {/* Статистика */}
      <h2 className="h-display mt-10 text-xl">Статистика</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card min-w-0 p-5 sm:p-6">
          <h3 className="font-bold">{grades ? 'По классам' : 'По уровням'}</h3>
          <div className="mt-4 space-y-3.5">
            {LEVELS.map((l) => {
              const list = tasksOfCategory(category).filter((t) => t.level === l.id)
              const done = solvedCount(records, list)
              return (
                <div key={l.id}>
                  <div className="flex justify-between text-sm">
                    <span className={`font-bold ${l.text}`}>{grades ? levelLabel(l.id, true) : `${l.id}. ${l.name}`}</span>
                    <span className="font-semibold text-muted">
                      {done} / {list.length}
                    </span>
                  </div>
                  <ProgressBar value={done} max={list.length} className="mt-1.5" color={l.bg} />
                </div>
              )
            })}
          </div>
        </section>
        <section className="card min-w-0 p-5 sm:p-6">
          <h3 className="font-bold">{grades ? 'По предметам' : 'По темам'}</h3>
          <div className="mt-4 space-y-3">
            {modules.map((m) => {
              const list = tasksOf(m.id)
              const done = solvedCount(records, list)
              const finishedList = list.filter((t) => finished(records[t.id]))
              const clean = finishedList.filter((t) => records[t.id]?.firstTry).length
              return (
                <Link key={m.id} to={`/module/${m.id}`} className="group flex items-center gap-3 rounded-lg transition hover:bg-surface-2">
                  <ModuleIcon id={m.id} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                      <span className="min-w-0 truncate font-semibold">{m.title}</span>
                      <span className="text-xs font-semibold text-muted">
                        {done}/{list.length}
                        {finishedList.length ? ` · ${Math.round((clean / finishedList.length) * 100)}% с 1-й попытки` : ''}
                      </span>
                    </div>
                    <ProgressBar value={done} max={list.length} className="mt-1" color={cat.bg} />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>

      <section className="card mt-4 p-5 sm:p-6">
        <h3 className="font-bold">Активность за {WEEKS} недель</h3>
        <div className="mt-4">
          <Heatmap days={stats.days} tones={cat.tones} />
        </div>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-bold">
          <Trophy size={18} className="text-warn" /> Достижения направления · {achs.filter((a) => a.done).length} из {achs.length}
        </h3>
        <Cascade className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(shown) =>
            achs.map((a, i) => (
              <div
                key={a.id}
                style={delay(i, 50)}
                className={`rounded-xl border p-4 transition duration-300 hover:-translate-y-0.5 ${riseOn(shown)} ${
                  a.done ? `${cat.border} ${cat.soft} hover:shadow-lift` : 'border-line bg-surface-2 [&>*]:opacity-70'
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.done ? <Trophy size={16} className={`${cat.text} ${shown ? 'animate-pop-in' : ''}`} style={delay(i + 3, 50)} /> : <Lock size={14} className="text-faint" />}
                  <span className="text-sm font-bold">{a.title}</span>
                </div>
                <p className="mt-1 text-xs text-muted">{a.description}</p>
              </div>
            ))
          }
        </Cascade>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-2 p-4 text-sm text-muted">
        <span>Общий прогресс по всем направлениям — в разделе «Прогресс».</span>
        <Link to="/progress" className={`inline-flex items-center gap-1 font-bold ${cat.text}`}>
          Открыть <ArrowRight size={15} />
        </Link>
      </div>
    </Page>
  )
}
