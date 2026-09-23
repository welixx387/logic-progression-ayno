import raw from '../content/tasks.json'
import type { Level, ModuleId, Task } from '../types'

export const TASKS = raw as Task[]
export const TASK_BY_ID = new Map(TASKS.map((t) => [t.id, t]))

const byModuleLevel = new Map<string, Task[]>()
for (const t of TASKS) {
  const key = `${t.module}:${t.level}`
  if (!byModuleLevel.has(key)) byModuleLevel.set(key, [])
  byModuleLevel.get(key)!.push(t)
}

export function tasksOf(module: ModuleId, level?: Level): Task[] {
  if (level) return byModuleLevel.get(`${module}:${level}`) ?? []
  return TASKS.filter((t) => t.module === module)
}

export function tasksOfLevel(level: Level): Task[] {
  return TASKS.filter((t) => t.level === level)
}

/** Соседние задачи внутри той же темы и уровня. */
export function siblings(task: Task) {
  const list = tasksOf(task.module, task.level)
  const index = list.findIndex((t) => t.id === task.id)
  return { list, index, prev: list[index - 1] ?? null, next: list[index + 1] ?? null }
}

/** Число, округлённое вниз до сотни: «600+». */
export const TOTAL_ROUNDED = Math.floor(TASKS.length / 100) * 100
