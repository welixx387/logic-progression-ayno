export type Level = 1 | 2 | 3 | 4 | 5

export type ModuleId =
  | 'sequences'
  | 'letters'
  | 'odd'
  | 'analogies'
  | 'syllogisms'
  | 'order'
  | 'knights'
  | 'symbols'
  | 'matrices'
  | 'time'
  | 'combinatorics'
  | 'zebra'
  | 'classic'

/** Как отвечать: выбрать вариант, ввести число или ввести текст. */
export type TaskKind = 'choice' | 'number' | 'text'

/** Дополнительная наглядная часть условия. */
export type TaskDisplay =
  | { type: 'sequence'; items: string[] }
  | { type: 'grid'; rows: string[][] }
  | { type: 'lines'; lines: string[] }

export interface Task {
  /** Стабильный идентификатор вида `sequences-3-07`. */
  id: string
  module: ModuleId
  level: Level
  kind: TaskKind
  /** Условие; переносы строк сохраняются. */
  prompt: string
  display?: TaskDisplay
  /** Варианты ответа для kind === 'choice'. */
  options?: string[]
  /** Правильный ответ (для choice — текст варианта). */
  answer: string
  /** Другие допустимые записи ответа для number/text. */
  accept?: string[]
  hint?: string
  /** Разбор решения; переносы строк сохраняются. */
  solution: string
  /** Отпечаток содержания задания — по нему отсеиваются повторы. */
  key?: string
}
