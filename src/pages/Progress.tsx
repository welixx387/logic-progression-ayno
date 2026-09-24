import { Award, Download, Flame, Lock, Monitor, Moon, RotateCcw, Sun, Target, Trophy, Upload, Zap } from 'lucide-react'
import { useRef, useState } from 'react'
import { Cascade, CountUp, delay, riseOn } from '../components/Motion'
import { CategoryIcon, LevelBadge, ModuleIcon, Page, ProgressBar, Stat } from '../components/ui'
import { CATEGORIES } from '../content/categories'
import { LEVELS, RANKS, rankFor } from '../content/levels'
import { modulesOf } from '../content/modules'
import { TASKS, tasksOf, tasksOfLevel } from '../lib/catalog'
import { addDays, dayKey, streaks } from '../lib/dates'
import { Link } from '../lib/router'
import { useAuth } from '../store/auth'
import { achievements, solvedCount, useProgress, type Theme } from '../store/progress'

const WEEKS = 16
const WEEKDAYS = ['пн', '', 'ср', '', 'пт', '', '']

function Heatmap({ days }: { days: Record<string, number> }) {
  const today = new Date()
  // Начинаем с понедельника недели, которая была WEEKS − 1 недель назад.
  const shift = (today.getDay() + 6) % 7
  const start = addDays(today, -shift - (WEEKS - 1) * 7)
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))
  const max = Math.max(1, ...Object.values(days))
  const tone = (n: number) => (n === 0 ? 'bg-surface-2' : n / max < 0.34 ? 'bg-accent/35' : n / max < 0.67 ? 'bg-accent/65' : 'bg-accent')
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <div className="grid grid-rows-7 gap-1 pt-0.5 text-[10px] font-semibold text-faint">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="h-3.5 leading-[14px]">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-flow-col grid-rows-7 gap-1">
        {cells.map((d, i) => {
          const key = dayKey(d)
          const n = days[key] ?? 0
          const future = d > today
          // Клетки проявляются неделя за неделей, слева направо.
          return (
            <span
              key={key}
              title={`${d.toLocaleDateString('ru-RU')}: ${n} задач`}
              className={`h-3.5 w-3.5 rounded-[4px] ${future ? 'opacity-0' : `animate-pop-in transition hover:scale-125 ${tone(n)}`}`}
              style={future ? undefined : delay(Math.floor(i / 7) + (i % 7) / 3, 35)}
            />
          )
        })}
      </div>
    </div>
  )
}

export function Progress() {
  const state = useProgress()
  const authStatus = useAuth((s) => s.status)
  const user = useAuth((s) => s.user)
  const { records, xp, days, bestRun, settings, setTheme, setOpenAll, reset, importState } = state
  const rank = rankFor(xp)
  const solved = solvedCount(records, TASKS)
  const generatedSolved = Object.entries(records).filter(([id, r]) => id.startsWith('g-') && r.solved).length
  const streak = streaks(days)
  const attempted = Object.values(records).filter((r) => r.solved || r.revealed)
  const clean = attempted.filter((r) => r.firstTry).length
  const accuracy = attempted.length ? Math.round((clean / attempted.length) * 100) : 0
  const achs = achievements(state, streak.best)
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportData = () => {
    const { records, xp, days, run, bestRun, placements, lastTaskId, seen } = useProgress.getState()
    const blob = new Blob([JSON.stringify({ app: 'logic-progression-ayno', records, xp, days, run, bestRun, placements, placement: placements.logic ?? null, lastTaskId, seen }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logic-progression-ayno-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const ok = importState(JSON.parse(await file.text()))
      setMessage(ok ? 'Прогресс загружен.' : 'Файл не похож на сохранение курса.')
    } catch {
      setMessage('Не удалось прочитать файл.')
    }
  }

  return (
    <Page className="py-8 sm:py-10">
      <p className="eyebrow">Прогресс</p>
      <h1 className="h-display mt-2 text-2xl sm:text-3xl">{rank.current.name}</h1>
      <div className="mt-3 flex max-w-lg items-center gap-3">
        <ProgressBar value={rank.progress * 100} max={100} className="flex-1" />
        <span className="shrink-0 text-sm font-semibold text-muted">{rank.next ? `${xp} / ${rank.next.xp} XP` : `${xp} XP`}</span>
      </div>
      {rank.next && <p className="mt-1.5 text-sm text-muted">Следующий ранг — «{rank.next.name}»</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Опыт" value={<CountUp value={xp} suffix=" XP" />} icon={<Zap size={14} className="text-warn" fill="currentColor" />} hint={`Ранг ${rank.index + 1} из ${RANKS.length}`} />
        <Stat
          label="Решено задач"
          value={<CountUp value={solved + generatedSolved} />}
          icon={<Target size={14} className="text-good" />}
          hint={generatedSolved ? `${solved} из ${TASKS.length} в курсе + ${generatedSolved} новых` : `из ${TASKS.length} в курсе`}
        />
        <Stat label="С первой попытки" value={<CountUp value={accuracy} suffix="%" />} icon={<Award size={14} className="text-accent" />} hint={`лучшая серия: ${bestRun} подряд`} />
        <Stat
          label="Серия дней"
          value={<CountUp value={streak.current} />}
          icon={<Flame size={14} className={`text-bad ${streak.current > 0 ? 'animate-flicker' : ''}`} />}
          hint={`рекорд: ${streak.best}`}
        />
      </div>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold">По направлениям</h2>
        <Cascade className="mt-4 grid gap-4 sm:grid-cols-2">
          {(shown) =>
            CATEGORIES.map((c, i) => {
              const list = modulesOf(c.id).flatMap((m) => tasksOf(m.id))
              const done = solvedCount(records, list)
              const placement = state.placements[c.id]
              return (
                <Link key={c.id} to={`/course?c=${c.id}`} className={`group flex items-center gap-3 rounded-xl p-2 transition hover:bg-surface-2 ${riseOn(shown)}`} style={delay(i, 80)}>
                  <CategoryIcon id={c.id} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm">
                      <span className="font-bold">{c.title}</span>
                      <span className="font-semibold text-muted">
                        {done} / {list.length}
                      </span>
                    </div>
                    <ProgressBar value={done} max={list.length} className="mt-1.5" color={c.bg} />
                    <div className="mt-1.5 text-xs text-muted">{placement ? <LevelBadge level={placement.level} /> : 'Тест уровня не пройден'}</div>
                  </div>
                </Link>
              )
            })
          }
        </Cascade>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold">Активность за {WEEKS} недель</h2>
        <div className="mt-4">
          <Heatmap days={days} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="font-bold">По уровням</h2>
          <div className="mt-4 space-y-3.5">
            {LEVELS.map((l) => {
              const list = tasksOfLevel(l.id)
              const done = solvedCount(records, list)
              return (
                <div key={l.id}>
                  <div className="flex justify-between text-sm">
                    <span className={`font-bold ${l.text}`}>
                      {l.id}. {l.name}
                    </span>
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
        <section className="card p-5 sm:p-6">
          <h2 className="font-bold">По темам</h2>
          <div className="mt-4 space-y-2.5">
            {CATEGORIES.map((c) => (
              <div key={c.id} className="space-y-2.5">
                <h3 className={`pt-2 text-xs font-bold uppercase tracking-[0.12em] ${c.text}`}>{c.tab}</h3>
                {modulesOf(c.id).map((m) => {
                  const list = tasksOf(m.id)
                  const done = solvedCount(records, list)
                  return (
                    <Link key={m.id} to={`/module/${m.id}`} className="group flex items-center gap-3 rounded-lg transition hover:bg-surface-2">
                      <ModuleIcon id={m.id} size="sm" />
                      <span className="w-36 shrink-0 truncate text-sm font-semibold sm:w-48">{m.title}</span>
                      <ProgressBar value={done} max={list.length} className="min-w-0 flex-1" color={c.bg} />
                      <span className="w-12 text-right text-xs font-semibold text-muted">
                        {done}/{list.length}
                      </span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold">
          <Trophy size={18} className="text-warn" /> Достижения · {achs.filter((a) => a.done).length} из {achs.length}
        </h2>
        <Cascade className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(shown) => achs.map((a, i) => (
            <div
              key={a.id}
              style={delay(i, 50)}
              className={`rounded-xl border p-4 transition duration-300 hover:-translate-y-0.5 ${riseOn(shown)} ${a.done ? 'border-warn/40 bg-warn-soft hover:shadow-lift' : 'border-line bg-surface-2 [&>*]:opacity-70'}`}
            >
              <div className="flex items-center gap-2">
                {a.done ? <Trophy size={16} className={`text-warn ${shown ? 'animate-pop-in' : ''}`} style={delay(i + 3, 50)} /> : <Lock size={14} className="text-faint" />}
                <span className="text-sm font-bold">{a.title}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{a.description}</p>
            </div>
          ))}
        </Cascade>
      </section>

      <section className="card mt-4 p-5 sm:p-6">
        <h2 className="font-bold">Настройки</h2>
        {authStatus !== 'off' && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="w-32 text-sm font-semibold text-muted">Аккаунт</span>
            {authStatus === 'authed' ? (
              <span className="text-sm">
                {user?.email} ·{' '}
                <Link to="/account" className="font-semibold text-accent hover:underline">
                  управление
                </Link>
              </span>
            ) : (
              <Link to="/account" className="btn-ghost py-2">
                Войти, чтобы сохранить прогресс на всех устройствах
              </Link>
            )}
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="w-32 text-sm font-semibold text-muted">Тема</span>
          <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
            {(
              [
                ['system', 'Авто', Monitor],
                ['light', 'Светлая', Sun],
                ['dark', 'Тёмная', Moon],
              ] as [Theme, string, typeof Sun][]
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  settings.theme === value ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={settings.openAll} onChange={(e) => setOpenAll(e.target.checked)} className="mt-1 h-4 w-4 accent-[rgb(var(--accent))]" />
          <span>
            <span className="text-sm font-semibold">Открыть все уровни</span>
            <span className="block text-xs text-muted">Свободный режим: все уровни всех тем доступны сразу, без условий.</span>
          </span>
        </label>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-5">
          <button className="btn-ghost" onClick={exportData}>
            <Download size={16} /> Сохранить прогресс в файл
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Загрузить из файла
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 rounded-xl bg-bad-soft px-3 py-1.5 text-sm font-semibold text-bad">
              Весь прогресс будет удалён.
              <button
                className="btn bg-bad px-3 py-1.5 text-white"
                onClick={() => {
                  reset()
                  setConfirmReset(false)
                  setMessage('Прогресс сброшен.')
                }}
              >
                Сбросить
              </button>
              <button className="btn-quiet px-3 py-1.5" onClick={() => setConfirmReset(false)}>
                Отмена
              </button>
            </span>
          ) : (
            <button className="btn-quiet text-bad hover:text-bad" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={16} /> Сбросить прогресс
            </button>
          )}
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-accent">{message}</p>}
      </section>
    </Page>
  )
}
