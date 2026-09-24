import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CATEGORIES, isGradeCategory } from '../content/categories'
import { levelInfo } from '../content/levels'
import { MODULE_BY_ID, MODULES } from '../content/modules'
import { tasksOf, TASKS } from '../lib/catalog'
import { dayKey } from '../lib/dates'
import { mergeProgress, sameProgress, type Placement, type Placements, type ProgressPayload, type TaskRecord } from '../lib/merge'
import type { CategoryId, Level, ModuleId, Task } from '../types'

export type { Placement, TaskRecord } from '../lib/merge'

export type Theme = 'system' | 'light' | 'dark'

interface Settings {
  theme: Theme
  /** Открыть все уровни без условий. */
  openAll: boolean
  /** Класс ученика для школьного направления (7–11). */
  grade?: number
}

interface ProgressState {
  records: Record<string, TaskRecord>
  xp: number
  /** Сколько задач решено по дням: YYYY-MM-DD → число. */
  days: Record<string, number>
  /** Серия задач подряд с первой попытки. */
  run: number
  bestRun: number
  /** Результаты теста уровня по направлениям. */
  placements: Placements
  lastTaskId: string | null
  /** Отпечатки уже показанных сгенерированных заданий — чтобы они не повторялись. */
  seen: string[]
  settings: Settings

  attempt: (task: Task, correct: boolean) => { xp: number; firstTime: boolean }
  markHint: (task: Task) => void
  reveal: (task: Task) => void
  visit: (task: Task) => void
  markSeen: (key: string) => void
  setPlacement: (category: CategoryId, level: Level, score: number[]) => void
  setTheme: (theme: Theme) => void
  setOpenAll: (open: boolean) => void
  setGrade: (grade: number) => void
  reset: () => void
  importState: (data: unknown) => boolean
  /** Вливает прогресс с другого устройства; возвращает true, если что-то изменилось. */
  mergeRemote: (remote: Partial<ProgressPayload>) => boolean
}

const empty = () => ({
  records: {} as Record<string, TaskRecord>,
  xp: 0,
  days: {} as Record<string, number>,
  run: 0,
  bestRun: 0,
  placements: {} as Placements,
  lastTaskId: null,
  seen: [] as string[],
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
      markSeen: (key) => set((s) => (s.seen.includes(key) ? s : { seen: [...s.seen, key] })),

      setPlacement: (category, level, score) => set((s) => ({ placements: { ...s.placements, [category]: { level, score, at: Date.now() } } })),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setOpenAll: (openAll) => set((s) => ({ settings: { ...s.settings, openAll } })),
      setGrade: (grade) => set((s) => ({ settings: { ...s.settings, grade } })),
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
          placements: placementsFrom(d),
          lastTaskId: d.lastTaskId ?? null,
          seen: Array.isArray(d.seen) ? d.seen : [],
        })
        return true
      },

      mergeRemote: (remote) => {
        const local = payloadOf(get())
        const merged = mergeProgress(local, remote)
        if (sameProgress(local, merged)) return false
        const { placement: _legacy, placements, ...rest } = merged
        set({ ...rest, placements: placements ?? {} })
        return true
      },
    }),
    {
      name: 'logic-progression-ayno',
      version: 2,
      // Версия 1 хранила один результат теста (он был про логику).
      migrate: (persisted, version) => {
        const p = persisted as Record<string, unknown>
        if (version < 2) return { ...p, placements: placementsFrom(p) }
        return p as never
      },
      partialize: (s) => ({
        records: s.records,
        xp: s.xp,
        days: s.days,
        run: s.run,
        bestRun: s.bestRun,
        placements: s.placements,
        lastTaskId: s.lastTaskId,
        seen: s.seen,
        settings: s.settings,
      }),
    },
  ),
)

// ——— Производные значения ———

/** Результаты теста из сохранения любой версии. */
function placementsFrom(d: { placements?: unknown; placement?: unknown }): Placements {
  const out: Placements = { ...((d.placements as Placements | undefined) ?? {}) }
  const legacy = d.placement as Placement | null | undefined
  if (legacy && (!out.logic || legacy.at > out.logic.at)) out.logic = legacy
  return out
}

/** Часть состояния, которая сохраняется в аккаунте и синхронизируется. */
export function payloadOf(s: Pick<ProgressState, 'records' | 'xp' | 'days' | 'run' | 'bestRun' | 'placements' | 'seen'>): ProgressPayload {
  return {
    records: s.records,
    xp: s.xp,
    days: s.days,
    run: s.run,
    bestRun: s.bestRun,
    // Старые версии сайта знают только это поле — пусть видят результат по логике.
    placement: s.placements.logic ?? null,
    placements: s.placements,
    seen: s.seen,
  }
}

export const categoryOf = (module: ModuleId): CategoryId => MODULE_BY_ID[module].category

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

export function isUnlocked(state: Pick<ProgressState, 'records' | 'placements' | 'settings'>, module: ModuleId, level: Level) {
  if (level === 1 || state.settings.openAll) return true
  // Школьные предметы: класс выбирают сами, классы не закрываются.
  if (isGradeCategory(categoryOf(module))) return true
  const placement = state.placements[categoryOf(module)]
  if (placement && placement.level >= level) return true
  const prev = tasksOf(module, (level - 1) as Level)
  return solvedCount(state.records, prev) >= unlockNeed(module, level)
}

/** Следующая нерешённая задача в теме, начиная с открытых уровней. */
export function nextTaskIn(state: Pick<ProgressState, 'records' | 'placements' | 'settings'>, module: ModuleId): Task | null {
  const cat = categoryOf(module)
  // В школьном направлении начинаем с класса ученика.
  const start = isGradeCategory(cat) && state.settings.grade ? state.settings.grade - 6 : (state.placements[cat]?.level ?? 1)
  const order = [start, 1, 2, 3, 4, 5].filter((v, i, a) => a.indexOf(v) === i) as Level[]
  for (const level of order) {
    if (!isUnlocked(state, module, level)) continue
    const t = tasksOf(module, level).find((x) => !state.records[x.id]?.solved && !state.records[x.id]?.revealed)
    if (t) return t
  }
  return null
}

/**
 * Задача дня — одна и та же для всех в этот день. Общая задача дня берётся
 * из направлений мышления; в школьном направлении — из задач своего класса.
 */
export function dailyTask(date = new Date(), category?: CategoryId, grade?: number): Task {
  const byGrade = !!category && isGradeCategory(category) && !!grade
  const key = category ? `${dayKey(date)}:${category}${byGrade ? `:${grade}` : ''}` : dayKey(date)
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  const inLevels = (t: Task) => (byGrade ? t.level === grade! - 6 : t.level >= 2 && t.level <= 4)
  const pool = TASKS.filter((t) => {
    const c = MODULE_BY_ID[t.module].category
    return inLevels(t) && (category ? c === category : !isGradeCategory(c))
  })
  return pool[(h >>> 0) % pool.length]
}

/** Достижения внутри одного направления. */
export function categoryAchievements(
  state: Pick<ProgressState, 'records' | 'placements' | 'settings'>,
  category: CategoryId,
  stats: { solved: number; solvedNew: number; expert: number },
): Achievement[] {
  const solvedIds = new Set(Object.entries(state.records).filter(([, r]) => r.solved).map(([id]) => id))
  const mods = MODULES.filter((m) => m.category === category)
  const touched = mods.filter((m) => tasksOf(m.id).some((t) => solvedIds.has(t.id))).length
  const full = mods.some((m) => tasksOf(m.id).every((t) => solvedIds.has(t.id)))
  const all = stats.solved + stats.solvedNew
  const grades = isGradeCategory(category)
  return [
    { id: 'first', title: 'Первый шаг', description: 'Решить первую задачу направления', done: all >= 1 },
    grades
      ? { id: 'grade', title: 'Мой класс', description: 'Выбрать свой класс', done: !!state.settings.grade }
      : { id: 'test', title: 'Знаю свой уровень', description: 'Пройти тест уровня направления', done: !!state.placements[category] },
    { id: 'ten', title: 'Десятка', description: 'Решить 10 задач', done: all >= 10 },
    grades
      ? { id: 'topics', title: 'Все предметы', description: `Решить задачу по каждому из ${mods.length} предметов`, done: touched === mods.length }
      : { id: 'topics', title: 'Все темы', description: `Решить задачу в каждой из ${mods.length} тем`, done: touched === mods.length },
    grades
      ? { id: 'expert', title: 'Выпускник', description: 'Решить задачу 11 класса', done: stats.expert > 0 }
      : { id: 'expert', title: 'Эксперт', description: 'Решить задачу 5-го уровня', done: stats.expert > 0 },
    { id: 'fifty', title: 'Полсотни', description: 'Решить 50 задач', done: all >= 50 },
    { id: 'new', title: 'Без конца', description: 'Решить 10 новых задач', done: stats.solvedNew >= 10 },
    { id: 'master', title: grades ? 'Отличник' : 'Мастер темы', description: grades ? 'Решить все задачи одного предмета' : 'Решить все задачи одной темы', done: full },
  ]
}

export interface Achievement {
  id: string
  title: string
  description: string
  done: boolean
}

export function achievements(state: Pick<ProgressState, 'records' | 'placements' | 'bestRun'>, streakBest: number): Achievement[] {
  const recs = Object.entries(state.records)
  const solved = recs.filter(([, r]) => r.solved)
  const solvedIds = new Set(solved.map(([id]) => id))
  const moduleDone = MODULES.some((m) => tasksOf(m.id).every((t) => solvedIds.has(t.id)))
  const expert = solved.some(([id]) => id.includes('-5-'))
  // Сгенерированные задачи узнаём по модулю через банк: у них id вида g-…, поэтому считаем только задачи курса.
  const solvedTasks = TASKS.filter((t) => solvedIds.has(t.id))
  const allDirections = CATEGORIES.every((c) => solvedTasks.some((t) => MODULE_BY_ID[t.module].category === c.id))
  return [
    { id: 'first', title: 'Первый шаг', description: 'Решить первую задачу', done: solved.length >= 1 },
    { id: 'ten', title: 'Разогрев', description: 'Решить 10 задач', done: solved.length >= 10 },
    { id: 'test', title: 'Знаю свой уровень', description: 'Пройти тест уровня', done: Object.keys(state.placements).length > 0 },
    { id: 'four', title: 'Разносторонний ум', description: 'Решить задачу в каждом направлении', done: allDirections },
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
