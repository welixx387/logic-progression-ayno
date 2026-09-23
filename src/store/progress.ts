import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { levelInfo } from '../content/levels'
import { tasksOf, TASKS } from '../lib/catalog'
import { dayKey } from '../lib/dates'
import type { Level, ModuleId, Task } from '../types'

export interface TaskRecord {
  solved: boolean
  /** Решена с первой попытки и без подсказки. */
  firstTry: boolean
  revealed: boolean
  hinted: boolean
  attempts: number
  xp: number
  at: number
}

export type Theme = 'system' | 'light' | 'dark'

interface Settings {
  theme: Theme
  /** Открыть все уровни без условий. */
  openAll: boolean
}

interface ProgressState {
  records: Record<string, TaskRecord>
  xp: number
  /** Сколько задач решено по дням: YYYY-MM-DD → число. */
  days: Record<string, number>
  /** Серия задач подряд с первой попытки. */
  run: number
  bestRun: number
  placement: { level: Level; at: number; score: number[] } | null
  lastTaskId: string | null
  settings: Settings

  attempt: (task: Task, correct: boolean) => { xp: number; firstTime: boolean }
  markHint: (task: Task) => void
  reveal: (task: Task) => void
  visit: (task: Task) => void
  setPlacement: (level: Level, score: number[]) => void
  setTheme: (theme: Theme) => void
  setOpenAll: (open: boolean) => void
  reset: () => void
  importState: (data: unknown) => boolean
}

const empty = () => ({
  records: {} as Record<string, TaskRecord>,
  xp: 0,
  days: {} as Record<string, number>,
  run: 0,
  bestRun: 0,
  placement: null,
  lastTaskId: null,
})

const blank = (): TaskRecord => ({ solved: false, firstTry: false, revealed: false, hinted: false, attempts: 0, xp: 0, at: 0 })

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...empty(),
      settings: { theme: 'system', openAll: false },

      attempt: (task, correct) => {
        const state = get()
        const prev = state.records[task.id] ?? blank()
        if (prev.solved || prev.revealed) return { xp: 0, firstTime: false }
        if (!correct) {
          set({
            records: { ...state.records, [task.id]: { ...prev, attempts: prev.attempts + 1, at: Date.now() } },
            run: 0,
          })
          return { xp: 0, firstTime: false }
        }
        const clean = prev.attempts === 0 && !prev.hinted
        const full = levelInfo(task.level).xp
        const xp = clean ? full : Math.round(full / 2)
        const today = dayKey()
        const run = clean ? state.run + 1 : 0
        set({
          records: { ...state.records, [task.id]: { ...prev, solved: true, firstTry: clean, xp, at: Date.now() } },
          xp: state.xp + xp,
          days: { ...state.days, [today]: (state.days[today] ?? 0) + 1 },
          run,
          bestRun: Math.max(state.bestRun, run),
        })
        return { xp, firstTime: true }
      },

      markHint: (task) => {
        const state = get()
        const prev = state.records[task.id] ?? blank()
        if (prev.solved || prev.hinted) return
        set({ records: { ...state.records, [task.id]: { ...prev, hinted: true } } })
      },

      reveal: (task) => {
        const state = get()
        const prev = state.records[task.id] ?? blank()
        if (prev.solved || prev.revealed) return
        set({ records: { ...state.records, [task.id]: { ...prev, revealed: true, at: Date.now() } }, run: 0 })
      },

      visit: (task) => set({ lastTaskId: task.id }),

      setPlacement: (level, score) => set({ placement: { level, score, at: Date.now() } }),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setOpenAll: (openAll) => set((s) => ({ settings: { ...s.settings, openAll } })),
      reset: () => set({ ...empty() }),

      importState: (data) => {
        const d = data as Partial<ProgressState> | null
        if (!d || typeof d !== 'object' || typeof d.records !== 'object' || typeof d.xp !== 'number') return false
        set({
          records: d.records ?? {},
          xp: d.xp ?? 0,
          days: d.days ?? {},
          run: d.run ?? 0,
          bestRun: d.bestRun ?? 0,
          placement: d.placement ?? null,
          lastTaskId: d.lastTaskId ?? null,
        })
        return true
      },
    }),
    {
      name: 'logic-progression-ayno',
      version: 1,
      partialize: (s) => ({
        records: s.records,
        xp: s.xp,
        days: s.days,
        run: s.run,
        bestRun: s.bestRun,
        placement: s.placement,
        lastTaskId: s.lastTaskId,
        settings: s.settings,
      }),
    },
  ),
)

// ——— Производные значения ———

export type TaskStatus = 'new' | 'tried' | 'solved' | 'perfect' | 'revealed'

export function statusOf(rec: TaskRecord | undefined): TaskStatus {
  if (!rec) return 'new'
  if (rec.solved) return rec.firstTry ? 'perfect' : 'solved'
  if (rec.revealed) return 'revealed'
  return rec.attempts > 0 ? 'tried' : 'new'
}

export function solvedCount(records: Record<string, TaskRecord>, tasks: Task[]) {
  return tasks.reduce((n, t) => n + (records[t.id]?.solved ? 1 : 0), 0)
}

/** Сколько задач предыдущего уровня нужно решить, чтобы открыть следующий. */
export function unlockNeed(module: ModuleId, level: Level) {
  if (level === 1) return 0
  return Math.ceil(tasksOf(module, (level - 1) as Level).length / 2)
}

export function isUnlocked(state: Pick<ProgressState, 'records' | 'placement' | 'settings'>, module: ModuleId, level: Level) {
  if (level === 1 || state.settings.openAll) return true
  if (state.placement && state.placement.level >= level) return true
  const prev = tasksOf(module, (level - 1) as Level)
  return solvedCount(state.records, prev) >= unlockNeed(module, level)
}

/** Следующая нерешённая задача в теме, начиная с открытых уровней. */
export function nextTaskIn(state: Pick<ProgressState, 'records' | 'placement' | 'settings'>, module: ModuleId): Task | null {
  const start = state.placement?.level ?? 1
  const order = [start, 1, 2, 3, 4, 5].filter((v, i, a) => a.indexOf(v) === i) as Level[]
  for (const level of order) {
    if (!isUnlocked(state, module, level)) continue
    const t = tasksOf(module, level).find((x) => !state.records[x.id]?.solved && !state.records[x.id]?.revealed)
    if (t) return t
  }
  return null
}

/** Задача дня — одна и та же для всех в этот день. */
export function dailyTask(date = new Date()): Task {
  const key = dayKey(date)
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  const pool = TASKS.filter((t) => t.level >= 2 && t.level <= 4)
  return pool[(h >>> 0) % pool.length]
}

export interface Achievement {
  id: string
  title: string
  description: string
  done: boolean
}

export function achievements(state: Pick<ProgressState, 'records' | 'placement' | 'bestRun'>, streakBest: number): Achievement[] {
  const recs = Object.entries(state.records)
  const solved = recs.filter(([, r]) => r.solved)
  const solvedIds = new Set(solved.map(([id]) => id))
  const moduleDone = (['sequences', 'letters', 'odd', 'analogies', 'syllogisms', 'order', 'knights', 'symbols', 'matrices', 'time', 'combinatorics', 'zebra', 'classic'] as ModuleId[]).some(
    (m) => tasksOf(m).every((t) => solvedIds.has(t.id)),
  )
  const expert = solved.some(([id]) => id.includes('-5-'))
  return [
    { id: 'first', title: 'Первый шаг', description: 'Решить первую задачу', done: solved.length >= 1 },
    { id: 'ten', title: 'Разогрев', description: 'Решить 10 задач', done: solved.length >= 10 },
    { id: 'test', title: 'Знаю свой уровень', description: 'Пройти тест уровня', done: !!state.placement },
    { id: 'run5', title: 'Без промаха', description: '5 задач подряд с первой попытки', done: state.bestRun >= 5 },
    { id: 'streak3', title: 'Привычка', description: 'Заниматься 3 дня подряд', done: streakBest >= 3 },
    { id: 'hundred', title: 'Сотня', description: 'Решить 100 задач', done: solved.length >= 100 },
    { id: 'expert', title: 'Экспертный уровень', description: 'Решить задачу 5-го уровня', done: expert },
    { id: 'run20', title: 'Снайпер', description: '20 задач подряд с первой попытки', done: state.bestRun >= 20 },
    { id: 'streak7', title: 'Неделя логики', description: 'Заниматься 7 дней подряд', done: streakBest >= 7 },
    { id: 'module', title: 'Мастер темы', description: 'Решить все задачи одной темы', done: moduleDone },
    { id: 'half', title: 'Экватор', description: 'Решить половину всех задач', done: solved.length >= Math.ceil(TASKS.length / 2) },
    { id: 'all', title: 'Logic progression', description: 'Решить все задачи курса', done: solved.length >= TASKS.length },
  ]
}
