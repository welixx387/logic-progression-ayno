// Отладочный просмотр заданий: node --experimental-strip-types scripts/show.ts <module> [level]
import { sequences } from './gen/sequences.ts'
import { letters } from './gen/letters.ts'
import { odd } from './gen/odd.ts'
import { analogies } from './gen/analogies.ts'
import { syllogisms } from './gen/syllogisms.ts'
import { order } from './gen/order.ts'
import { knights } from './gen/knights.ts'
import { symbols } from './gen/symbols.ts'
import { matrices } from './gen/matrices.ts'
import { time } from './gen/time.ts'
import { combinatorics } from './gen/combinatorics.ts'
import { zebra } from './gen/zebra.ts'
import { classic } from './gen/classic.ts'
const gens: Record<string, () => any[]> = { sequences, letters, odd, analogies, syllogisms, order, knights, symbols, matrices, time, combinatorics, zebra, classic }
const [mod, lvl] = process.argv.slice(2)
for (const t of gens[mod]()) {
  if (lvl && String(t.level) !== lvl) continue
  const d = t.display ? (t.display.items ?? t.display.lines ?? t.display.rows)?.map((x: any) => Array.isArray(x) ? x.join(' ') : x).join(' | ') : ''
  console.log(`\n## ${t.id} ${t.prompt}\n   ${d}${t.options ? `\n   [${t.options.join(' / ')}]` : ''}\n   → ${t.answer}\n   ${t.solution.replace(/\n/g, '\n   ')}`)
}
