import { ArrowLeft, ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useEffect } from 'react'
import { TaskCard } from '../components/TaskCard'
import { LevelBadge, Page } from '../components/ui'
import { CATEGORY_BY_ID, isGradeCategory } from '../content/categories'
import { levelLabel } from '../content/levels'
import { MODULE_BY_ID } from '../content/modules'
import { siblings, TASK_BY_ID, tasksOf } from '../lib/catalog'
import { Link } from '../lib/router'
import { isUnlocked, statusOf, useProgress } from '../store/progress'
import type { Level } from '../types'
import { NotFound } from './NotFound'

export function TaskPage({ id, daily = false }: { id: string; daily?: boolean }) {
  const state = useProgress()
  const visit = useProgress((s) => s.visit)
  const task = TASK_BY_ID.get(id)

  useEffect(() => {
    if (task) visit(task)
  }, [task, visit])

  if (!task) return <NotFound />
  const m = MODULE_BY_ID[task.module]
  const cat = CATEGORY_BY_ID[m.category]
  const grades = isGradeCategory(m.category)
  const { list, index, prev, next } = siblings(task)
  const unlocked = daily || isUnlocked(state, task.module, task.level)
  const solved = !!state.records[task.id]?.solved || !!state.records[task.id]?.revealed

  // Куда идти после последней задачи уровня.
  const nextLevel = task.level < 5 ? tasksOf(task.module, (task.level + 1) as Level)[0] : null
  const after = daily ? (
    <Link to={`/c/${m.category}`} className="btn-primary">
      К направлению <ArrowRight size={16} />
    </Link>
  ) : next ? (
    <Link to={`/task/${next.id}`} className="btn-primary">
      Следующая задача <ArrowRight size={16} />
    </Link>
  ) : nextLevel && isUnlocked(state, task.module, nextLevel.level) ? (
    <Link to={`/task/${nextLevel.id}`} className="btn-primary">
      {grades ? levelLabel(nextLevel.level, true) : `Уровень ${nextLevel.level}`} <ArrowRight size={16} />
    </Link>
  ) : (
    <Link to={`/module/${task.module}?l=${task.level}`} className="btn-primary">
      К списку задач <ArrowRight size={16} />
    </Link>
  )

  return (
    <Page className="max-w-3xl py-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm font-semibold text-muted">
          <ArrowLeft size={16} className="shrink-0" />
          <Link to={`/c/${m.category}`} className={`hover:underline ${cat.text}`}>
            {cat.tab}
          </Link>
          <span className="text-faint">/</span>
          <Link to={`/module/${task.module}?l=${task.level}`} className="hover:text-ink">
            {m.title}
          </Link>
        </div>
        <LevelBadge level={task.level} grades={grades} />
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        {daily ? (
          <h1 className="flex items-center gap-2 font-display text-lg font-semibold">
            <CalendarDays size={20} className="text-warn" /> Задача дня
          </h1>
        ) : (
          <h1 className="font-display text-lg font-semibold">
            Задача {index + 1} <span className="text-faint">из {list.length}</span>
          </h1>
        )}
        {!daily && (
          <div className="flex gap-1.5">
            <Link
              to={prev ? `/task/${prev.id}` : '#'}
              aria-disabled={!prev}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface ${prev ? 'text-ink hover:bg-surface-2' : 'pointer-events-none opacity-40'}`}
              aria-label="Предыдущая задача"
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              to={next ? `/task/${next.id}` : '#'}
              aria-disabled={!next}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-surface ${next ? 'text-ink hover:bg-surface-2' : 'pointer-events-none opacity-40'}`}
              aria-label="Следующая задача"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        )}
      </div>

      {!daily && (
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {list.map((t) => {
            const st = statusOf(state.records[t.id])
            const color = st === 'perfect' || st === 'solved' ? 'bg-good' : st === 'revealed' ? 'bg-warn' : st === 'tried' ? 'bg-bad' : 'bg-surface-2'
            return <span key={t.id} className={`h-1.5 flex-1 rounded-full ${color} ${t.id === task.id ? 'ring-2 ring-accent ring-offset-1 ring-offset-bg' : ''}`} />
          })}
        </div>
      )}

      <div className="mt-5">
        {unlocked ? (
          <TaskCard key={task.id} task={task} after={after} autoFocus />
        ) : (
          <div className="card flex flex-col items-center p-8 text-center">
            <Lock size={28} className="text-muted" />
            <h2 className="mt-3 font-bold">Эта задача на закрытом уровне</h2>
            <p className="mt-1 text-sm text-muted">Решите половину задач предыдущего уровня темы или пройдите тест уровня.</p>
            <div className="mt-5 flex gap-2">
              <Link to={`/module/${task.module}?l=${task.level - 1}`} className="btn-ghost">
                К уровню {task.level - 1}
              </Link>
              <Link to={`/c/${m.category}/test`} className="btn-primary">
                Тест уровня
              </Link>
            </div>
          </div>
        )}
      </div>

      {unlocked && !solved && !daily && next && (
        <div className="mt-4 text-right">
          <Link to={`/task/${next.id}`} className="text-sm font-semibold text-muted hover:text-ink">
            Пропустить →
          </Link>
        </div>
      )}
    </Page>
  )
}
