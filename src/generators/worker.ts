/// <reference lib="webworker" />
/**
 * Фоновый поток: создаёт новые задания, не мешая интерфейсу (некоторые
 * генераторы перебирают десятки тысяч вариантов).
 */
import type { Level, ModuleId } from '../types.ts'
import { GENERATORS } from './index.ts'
import { generateFresh } from './util.ts'

export interface GenerateRequest {
  id: number
  modules: ModuleId[]
  level: Level
  /** Отпечатки заданий, которые уже встречались, — их не повторяем. */
  seen: string[]
}

function randomSeed() {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  return `${buf[0].toString(36)}${buf[1].toString(36)}`
}

self.onmessage = (event: MessageEvent<GenerateRequest>) => {
  const { id, modules, level, seen } = event.data
  const seenSet = new Set(seen)
  // Пробуем темы в случайном порядке: если в одной варианты кончились, берём другую.
  const order = modules.slice().sort(() => Math.random() - 0.5)
  const exhausted: ModuleId[] = []
  for (const module of order) {
    const gen = GENERATORS[module]
    if (!gen) continue
    const task = generateFresh(gen, level, seenSet, randomSeed())
    if (task) {
      self.postMessage({ id, task, exhausted })
      return
    }
    exhausted.push(module)
  }
  self.postMessage({ id, task: null, exhausted })
}
