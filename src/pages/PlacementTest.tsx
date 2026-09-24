import { ArrowLeft, ArrowRight, Clock, Gauge, ListChecks, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Burst, delay } from '../components/Motion'
import { TaskCard } from '../components/TaskCard'
import { CategoryIcon, LevelBars, Page, ProgressBar } from '../components/ui'
import { CATEGORY_BY_ID, isGradeCategory } from '../content/categories'
import { LEVELS, levelInfo } from '../content/levels'
import { modulesOf } from '../content/modules'
import { tasksOf } from '../lib/catalog'
import { Link } from '../lib/router'
import { useProgress } from '../store/progress'
import type { CategoryId, Level, ModuleId, Task } from '../types'

const PER_LEVEL = 3

/** Темы направления, из которых собирается тест (слишком длинные задачи не берём). */
const testModules = (c: CategoryId): ModuleId[] => modulesOf(c).filter((m) => !m.noTest).map((m) => m.id)

/** Что проверяет тест каждого направления. */
const WHAT: Record<CategoryId, string> = {
  logic: 'Тест проверит разные виды логики — от числовых рядов до силлогизмов — и откроет подходящие уровни во всех темах логики.',
  strategy: 'Тест проверит игры на выигрыш, планирование, выгодные решения и умение думать на ход вперёд — и откроет подходящие уровни в темах стратегии.',
  analytics: 'Тест проверит работу с таблицами, процентами, вероятностями и средними — и откроет подходящие уровни в темах анализа.',
  emotional: 'Тест проверит словарь эмоций, умение распознавать чувства, справляться с ними и общаться — и откроет подходящие уровни в темах эмоционального мышления.',
  academic: '',
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function buildTest(category: CategoryId): Task[] {
  const tasks: Task[] = []
  for (const l of LEVELS) {
    const modules = testModules(category)
      .filter((m) => tasksOf(m, l.id).length > 0)
      .sort(() => Math.random() - 0.5)
      .slice(0, PER_LEVEL)
    for (const m of modules) tasks.push(pick(tasksOf(m, l.id)))
  }
  return tasks
}

/** Уровень — самый высокий, на котором и на всех предыдущих решено хотя бы 2 из 3. */
function levelFrom(score: number[]): Level {
  let level = 1
  for (let i = 0; i < score.length; i++) {
    if (score[i] >= 2) level = i + 1
    else break
  }
  return level as Level
}

export function PlacementTest({ category }: { category: CategoryId }) {
  const cat = CATEGORY_BY_ID[category]
  const placement = useProgress((s) => s.placements[category])
  const setPlacement = useProgress((s) => s.setPlacement)
  const [test, setTest] = useState<Task[] | null>(null)
  const [answers, setAnswers] = useState<boolean[]>([])

  const start = () => {
    setTest(buildTest(category))
    setAnswers([])
  }

  const scoreOf = (a: boolean[]) => LEVELS.map((_, i) => a.slice(i * PER_LEVEL, (i + 1) * PER_LEVEL).filter(Boolean).length)

  // Как только тест пройден, запоминаем результат — он открывает уровни в курсе.
  useEffect(() => {
    if (test && answers.length === test.length) {
      const score = scoreOf(answers)
      setPlacement(category, levelFrom(score), score)
    }
  }, [answers, test, setPlacement, category])

  // Для школьных предметов тест не нужен: класс ученик выбирает сам.
  if (isGradeCategory(category)) {
    return (
      <Page className="max-w-2xl py-12">
        <p className={`text-xs font-bold uppercase tracking-[0.14em] ${cat.text}`}>{cat.title}</p>
        <h1 className="h-display mt-2 text-2xl">Тест не нужен — выберите свой класс</h1>
        <p className="mt-3 leading-relaxed text-muted">Задачи по школьным предметам разделены по классам с 7 по 11. Все классы открыты сразу: выберите свой на странице направления.</p>
        <Link to={`/c/${category}`} className="btn-primary mt-6">
          К школьным предметам <ArrowRight size={16} />
        </Link>
      </Page>
    )
  }

  if (test && answers.length >= test.length) {
    const score = scoreOf(answers)
    const level = levelFrom(score)
    const info = levelInfo(level)
    const total = answers.filter(Boolean).length
    return (
      <Page className="max-w-3xl py-10">
        <span className={`relative inline-flex h-16 w-16 animate-pop-in items-center justify-center rounded-2xl font-display text-3xl font-semibold text-white ${info.bg}`}>
          {level}
          <Burst count={18} spread={84} />
        </span>
        <p className="eyebrow mt-5">Результат теста · {cat.title}</p>
        <h1 className="h-display mt-2 animate-fade-up text-3xl">
          Ваш уровень: <span className={info.text}>{level} · {info.name}</span>
        </h1>
        <p className="mt-3 animate-fade-up text-muted" style={delay(1)}>
          Правильных ответов: {total} из {test.length}. {info.description}
        </p>
        <div className="card mt-6 animate-fade-up space-y-4 p-5 sm:p-6" style={delay(2)}>
          {LEVELS.map((l, i) => (
            <div key={l.id} className="flex animate-fade-up items-center gap-4" style={delay(i + 3, 80)}>
              <span className={`flex w-40 shrink-0 items-center gap-2 text-sm font-bold ${l.text}`}>
                <LevelBars level={l.id} /> {l.id}. {l.name}
              </span>
              <ProgressBar value={score[i]} max={PER_LEVEL} className="flex-1" color={l.bg} />
              <span className="w-10 text-right text-sm font-semibold text-muted">
                {score[i]}/{PER_LEVEL}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">
          {level === 1
            ? `Начните с уровня 1 во всех темах направления «${cat.title}» — следующие уровни откроются по мере решения задач.`
            : `Уровни 1–${level} теперь открыты во всех темах направления «${cat.title}». Следующие уровни откроются по мере решения задач.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/c/${category}`} className="btn-primary px-6 py-3">
            К направлению <ArrowRight size={17} />
          </Link>
          <button className="btn-ghost px-6 py-3" onClick={start}>
            <RotateCcw size={16} /> Пройти заново
          </button>
        </div>
      </Page>
    )
  }

  if (test) {
    const i = answers.length
    const task = test[i]
    return (
      <Page className="max-w-3xl py-6 sm:py-10">
        <div className="flex items-center justify-between">
          <button className="text-sm font-semibold text-muted hover:text-ink" onClick={() => setTest(null)}>
            ← Прервать тест
          </button>
          <span className="flex items-center gap-2 text-sm font-bold">
            <span className={`hidden sm:inline ${cat.text}`}>{cat.tab} ·</span> Вопрос {i + 1} из {test.length}
          </span>
        </div>
        <ProgressBar value={i} max={test.length} className="mt-3" />
        <div key={i} className="mt-5 animate-fade-up">
          <TaskCard key={`${i}-${task.id}`} task={task} mode="test" autoFocus onResult={({ correct }) => setAnswers((a) => [...a, correct])} />
        </div>
        <p className="mt-4 text-center text-xs text-faint">В тесте одна попытка на вопрос и нет подсказок. Разборы задач доступны в курсе.</p>
      </Page>
    )
  }

  return (
    <Page className="max-w-3xl py-10">
      <Link to={`/c/${category}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> {cat.title}
      </Link>
      <p className={`mt-4 text-xs font-bold uppercase tracking-[0.14em] ${cat.text}`}>Тест уровня · {cat.tab}</p>
      <h1 className="h-display mt-2 text-3xl">С какого уровня начать?</h1>
      <div className="mt-5 flex animate-fade-up items-start gap-4">
        <CategoryIcon id={category} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold">{cat.title}</h2>
          <p className="mt-1 leading-relaxed text-muted">{WHAT[category]}</p>
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ListChecks, title: '15 задач', text: 'по 3 на каждый уровень' },
          { icon: Clock, title: '10–15 минут', text: 'без ограничения времени' },
          { icon: Gauge, title: 'Одна попытка', text: 'без подсказок и разборов' },
        ].map(({ icon: Icon, title, text }, i) => (
          <div key={title} className="card group animate-fade-up p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift" style={delay(i, 90)}>
            <Icon size={20} className={`transition duration-300 group-hover:scale-110 ${cat.text}`} />
            <div className="mt-2 font-bold">{title}</div>
            <div className="text-sm text-muted">{text}</div>
          </div>
        ))}
      </div>
      {placement && (
        <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
          Вы уже проходили тест: уровень {placement.level} «{levelInfo(placement.level).name}». Можно пройти ещё раз — результат обновится.
        </p>
      )}
      <button className="btn-primary group mt-6 px-6 py-3 text-base" onClick={start}>
        Начать тест <ArrowRight size={18} className="transition group-hover:translate-x-1" />
      </button>
    </Page>
  )
}
