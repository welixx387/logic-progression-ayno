import type { Task } from '../types'

const normalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'.!?]/g, '')
    .replace(/\s+/g, ' ')

/** Достаёт число из ввода: «4,8 км/ч» → 4.8, «5 050» → 5050. */
export function parseNumber(input: string): number | null {
  const cleaned = input.replace(/\s+/g, '').replace(',', '.').replace('−', '-')
  const m = cleaned.match(/^-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : null
}

export function isCorrect(task: Task, input: string): boolean {
  if (task.kind === 'choice') return input === task.answer
  if (task.kind === 'number') {
    const n = parseNumber(input)
    return n !== null && Math.abs(n - Number(task.answer)) < 1e-9
  }
  const given = normalize(input)
  return [task.answer, ...(task.accept ?? [])].some((a) => normalize(a) === given)
}
