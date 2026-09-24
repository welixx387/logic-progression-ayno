/**
 * Генерирует банк заданий src/content/tasks.json и проверяет его.
 * Запуск: npm run tasks
 */
import { writeFileSync } from 'node:fs'
import type { Task } from '../src/types.ts'
import { sequences } from '../src/generators/sequences.ts'
import { letters } from '../src/generators/letters.ts'
import { odd } from '../src/generators/odd.ts'
import { analogies } from '../src/generators/analogies.ts'
import { syllogisms } from '../src/generators/syllogisms.ts'
import { order } from '../src/generators/order.ts'
import { knights } from '../src/generators/knights.ts'
import { symbols } from '../src/generators/symbols.ts'
import { matrices } from '../src/generators/matrices.ts'
import { time } from '../src/generators/time.ts'
import { combinatorics } from '../src/generators/combinatorics.ts'
import { zebra } from '../src/generators/zebra.ts'
import { classic } from '../src/generators/classic.ts'

const generators: [string, () => Task[]][] = [
  ['sequences', sequences],
  ['letters', letters],
  ['odd', odd],
  ['analogies', analogies],
  ['syllogisms', syllogisms],
  ['order', order],
  ['knights', knights],
  ['symbols', symbols],
  ['matrices', matrices],
  ['time', time],
  ['combinatorics', combinatorics],
  ['zebra', zebra],
  ['classic', classic],
]

const only = process.argv[2]
const tasks: Task[] = []
for (const [name, gen] of generators) {
  if (only && only !== name) continue
  const started = Date.now()
  const made = gen()
  tasks.push(...made)
  console.log(`${name.padEnd(14)} ${String(made.length).padStart(3)} заданий  ${Date.now() - started} мс`)
}

// ——— Проверки ———
const problems: string[] = []
const ids = new Set<string>()
for (const t of tasks) {
  if (ids.has(t.id)) problems.push(`${t.id}: повтор id`)
  ids.add(t.id)
  if (!t.prompt.trim()) problems.push(`${t.id}: пустое условие`)
  if (!t.solution.trim()) problems.push(`${t.id}: нет решения`)
  if (/undefined|NaN|null|\[object/.test(JSON.stringify(t))) problems.push(`${t.id}: подозрительный текст`)
  if (t.kind === 'choice') {
    if (!t.options || t.options.length < 2) problems.push(`${t.id}: мало вариантов`)
    else {
      if (!t.options.includes(t.answer)) problems.push(`${t.id}: ответа нет среди вариантов`)
      if (new Set(t.options).size !== t.options.length) problems.push(`${t.id}: повторяются варианты`)
    }
  }
  if (t.kind === 'number' && !/^-?\d+(\.\d+)?$/.test(t.answer)) problems.push(`${t.id}: ответ не число: ${t.answer}`)
}

if (problems.length) {
  console.error(`\nНайдены проблемы (${problems.length}):\n${problems.join('\n')}`)
  process.exit(1)
}

console.log(`\nВсего: ${tasks.length} заданий`)
for (const level of [1, 2, 3, 4, 5]) {
  console.log(`  уровень ${level}: ${tasks.filter((t) => t.level === level).length}`)
}

if (!only) {
  writeFileSync(new URL('../src/content/tasks.json', import.meta.url), JSON.stringify(tasks))
  console.log('Записано в src/content/tasks.json')
} else if (process.argv[3] === '--show') {
  for (const t of tasks) {
    console.log(`\n=== ${t.id} [${t.kind}] ===\n${t.prompt}`)
    if (t.display) console.log(JSON.stringify(t.display))
    if (t.options) console.log(`Варианты: ${t.options.join(' | ')}`)
    console.log(`Ответ: ${t.answer}\nРешение: ${t.solution}`)
  }
}
