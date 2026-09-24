/**
 * Оценивает, сколько разных заданий способен создать генератор каждой темы
 * на каждом уровне: создаём задания подряд без повторов, пока генератор не
 * перестанет находить новые (или пока не наберётся LIMIT).
 * Запуск: node --experimental-strip-types --no-warnings scripts/capacity.ts [тема]
 */
import { GENERATORS } from '../src/generators/index.ts'
import { generateFresh, LEVELS } from '../src/generators/util.ts'
import type { ModuleId } from '../src/types.ts'

const LIMIT = Number(process.env.LIMIT ?? 1000)
const only = process.argv[2]

for (const [module, gen] of Object.entries(GENERATORS) as [ModuleId, NonNullable<(typeof GENERATORS)[ModuleId]>][]) {
  if (only && only !== module) continue
  const started = Date.now()
  const counts = LEVELS.map((level) => {
    const seen = new Set<string>()
    for (let i = 0; i < LIMIT; i++) {
      const t = generateFresh(gen, level, seen, `${module}:${level}:cap:${i}`)
      if (!t) break
      seen.add(t.key!)
    }
    return seen.size
  })
  const fmt = counts.map((n) => (n >= LIMIT ? `${LIMIT}+` : String(n)).padStart(6)).join('')
  console.log(`${module.padEnd(14)}${fmt}   ${((Date.now() - started) / 1000).toFixed(1)} с`)
}
