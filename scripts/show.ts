// Отладочный просмотр заданий банка: node --experimental-strip-types scripts/show.ts <тема> [уровень]
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
const gens: Record<string, () => any[]> = { sequences, letters, odd, analogies, syllogisms, order, knights, symbols, matrices, time, combinatorics, zebra, classic }
const [mod, lvl] = process.argv.slice(2)
for (const t of gens[mod]()) {
  if (lvl && String(t.level) !== lvl) continue
  const d = t.display ? (t.display.items ?? t.display.lines ?? t.display.rows)?.map((x: any) => Array.isArray(x) ? x.join(' ') : x).join(' | ') : ''
  console.log(`\n## ${t.id} ${t.prompt}\n   ${d}${t.options ? `\n   [${t.options.join(' / ')}]` : ''}\n   → ${t.answer}\n   ${t.solution.replace(/\n/g, '\n   ')}`)
}
