export type Level = 1 | 2 | 3 | 4 | 5

/** Направление курса: логика, стратегия, анализ, эмоции, память или школьные предметы. */
export type CategoryId = 'logic' | 'strategy' | 'analytics' | 'emotional' | 'memory' | 'academic'

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
  | 'conditionals'
  | 'negation'
  | 'euler'
  | 'pigeonhole'
  | 'parity'
  | 'weighing'
  | 'pouring'
  | 'ciphers'
  | 'rebus'
  | 'magic'
  | 'cubes'
  | 'graphs'
  // Стратегическое мышление
  | 'games'
  | 'planning'
  | 'decisions'
  | 'opponent'
  | 'priorities'
  | 'smart'
  | 'swot'
  | 'assignment'
  | 'scheduling'
  | 'routing'
  | 'inventory'
  | 'uncertainty'
  | 'dtree'
  | 'opportunity'
  | 'compound'
  | 'pricing'
  | 'biases'
  | 'search'
  | 'stopping'
  | 'voting'
  | 'fairdiv'
  | 'negotiation'
  | 'auctions'
  | 'cooperation'
  | 'tictactoe'
  // Аналитическое мышление
  | 'tables'
  | 'percent'
  | 'probability'
  | 'stats'
  | 'trends'
  | 'growth'
  | 'proportion'
  | 'pie'
  | 'pivot'
  | 'timeseries'
  | 'estimates'
  | 'spread'
  | 'normal'
  | 'weighted'
  | 'bayes'
  | 'expected'
  | 'correlation'
  | 'simpson'
  | 'sampling'
  | 'funnel'
  | 'abtest'
  | 'loans'
  | 'deals'
  | 'scoring'
  | 'fallacies'
  // Эмоциональное мышление
  | 'emotions'
  | 'recognize'
  | 'regulation'
  | 'empathy'
  // Память
  | 'digits'
  | 'backward'
  | 'chunking'
  | 'numgrid'
  | 'workmem'
  | 'flats'
  | 'codes'
  | 'years'
  | 'wordlist'
  | 'wordorder'
  | 'chain'
  | 'pairs'
  | 'names'
  | 'colors'
  | 'changes'
  | 'signs'
  | 'shopping'
  | 'route'
  | 'schedule'
  | 'story'
  | 'scene'
  | 'cards'
  | 'citymap'
  | 'dots'
  // Академические способности: школьные предметы, уровни — 7–11 классы
  | 'algebra'
  | 'geometry'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'informatics'
  | 'russian'
  | 'literature'
  | 'english'
  | 'history'
  | 'social'
  | 'geography'
  | 'safety'

/** Как отвечать: выбрать вариант, ввести число или ввести текст. */
export type TaskKind = 'choice' | 'number' | 'text'

/** Дополнительная наглядная часть условия. */
export type TaskDisplay =
  | { type: 'sequence'; items: string[] }
  | { type: 'grid'; rows: string[][] }
  | { type: 'lines'; lines: string[] }
  /** Таблица с заголовками столбцов; первый столбец — подписи строк. */
  | { type: 'table'; head: string[]; rows: string[][] }
  /** Горизонтальная столбчатая диаграмма. */
  | { type: 'bars'; unit?: string; items: { label: string; value: number }[] }
  /** Реплика или диалог: кто говорит и что. */
  | { type: 'dialog'; lines: { who: string; text: string }[] }
  /** Абзац текста. */
  | { type: 'text'; text: string }
  /** Круговая диаграмма: доли подписаны в легенде. */
  | { type: 'pie'; items: { label: string; value: number }[]; unit?: string }
  /** Слова или короткие фразы «плашками». */
  | { type: 'words'; items: string[] }
  /**
   * Задание на память: материал показывается `seconds` секунд (или пока
   * человек не нажмёт «Запомнил»), затем скрывается и появляется вопрос.
   */
  | { type: 'memorize'; seconds: number; title: string; content: TaskDisplay }

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
  /** Пояснения к вариантам ответа: почему вариант верный или неверный. */
  notes?: Record<string, string>
  /** Номер раздела теории темы, который объясняет задачу. */
  ref?: number
  /** Отпечаток содержания задания — по нему отсеиваются повторы. */
  key?: string
}
