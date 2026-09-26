import GeneratorWorker from './generator-worker'
import type { Level, ModuleId, Task } from '../types'
import { tasksOf } from './catalog'

export const NO_GENERATOR: ModuleId[] = ['classic']

interface Reply {
  id: number
  task: Task | null
  exhausted: ModuleId[]
}

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, (reply: Reply) => void>()

function getWorker() {
  if (!worker) {
    worker = new GeneratorWorker()
    worker.onmessage = (event: MessageEvent<Reply>) => {
      pending.get(event.data.id)?.(event.data)
      pending.delete(event.data.id)
    }
  }
  return worker
}

/** Отпечатки заданий курса — новые задания не должны их повторять. */
function courseKeys(modules: ModuleId[], level: Level) {
  return modules.flatMap((m) => tasksOf(m, level).map((t) => t.key).filter((k): k is string => !!k))
}

/**
 * Просит фоновый поток создать новое задание одной из тем, которого ещё не
 * было ни в курсе, ни среди seen. task === null — варианты закончились.
 */
export function generateTask(modules: ModuleId[], level: Level, seen: string[]): Promise<Reply> {
  const id = nextId++
  const usable = modules.filter((m) => !NO_GENERATOR.includes(m))
  return new Promise((resolve) => {
    pending.set(id, resolve)
    getWorker().postMessage({ id, modules: usable, level, seen: [...seen, ...courseKeys(usable, level)] })
  })
}
