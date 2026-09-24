import { ArrowRight, BookOpen, ChartColumn, ChevronDown, Gauge, Sparkles, Target } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Cascade, CountUp, delay, Reveal, riseOn, useReveal } from '../components/Motion'
import { TaskCard } from '../components/TaskCard'
import { CategoryIcon, LevelBars, Page, SectionTitle } from '../components/ui'
import { CATEGORIES } from '../content/categories'
import { LEVELS } from '../content/levels'
import { MODULES, modulesOf } from '../content/modules'
import { TASKS, TOTAL_ROUNDED, tasksOf, tasksOfLevel } from '../lib/catalog'
import { Link } from '../lib/router'
import { isCloudConfigured } from '../lib/supabase'
import type { Task } from '../types'

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const DEMO: Task = {
  id: 'demo',
  module: 'sequences',
  level: 2,
  kind: 'number',
  prompt: 'Какое число должно стоять на месте знака вопроса?',
  display: { type: 'sequence', items: ['3', '6', '11', '18', '27', '?'] },
  answer: '38',
  hint: 'Посмотрите, на сколько увеличивается каждое следующее число.',
  solution: 'Разности между соседними числами: +3, +5, +7, +9 — нечётные числа подряд. Следующая разность +11: 27 + 11 = 38.',
}

/** Символы логики, которые медленно парят вокруг первого экрана. */
const GLYPHS = [
  { text: '?', className: 'left-[6%] top-[18%] text-5xl text-accent/25', r: '-8deg', d: 0, t: 7 },
  { text: '∴', className: 'right-[8%] top-[10%] text-4xl text-lvl4/30', r: '6deg', d: 1.2, t: 8 },
  { text: '7', className: 'left-[44%] top-[6%] text-3xl text-lvl2/30', r: '10deg', d: 0.6, t: 6.5 },
  { text: '△', className: 'bottom-[12%] left-[3%] text-4xl text-lvl3/30', r: '-12deg', d: 2, t: 9 },
  { text: '∞', className: 'bottom-[8%] right-[4%] text-5xl text-accent/20', r: '4deg', d: 1.6, t: 7.5 },
]

const STEPS = [
  { icon: Gauge, title: 'Тест уровня', text: '15 задач за 10–15 минут покажут, с какого уровня начинать. У каждого направления — свой тест.' },
  { icon: BookOpen, title: 'Короткая теория', text: 'В каждой теме — главные приёмы и разобранный пример. Никакой воды: только то, что помогает решать.' },
  { icon: Target, title: 'Практика с разбором', text: 'Подсказка, если застряли, и подробное решение после ответа. Ошибка — тоже часть обучения.' },
  { icon: ChartColumn, title: 'Видимый прогресс', text: 'Опыт, ранги, серия дней и достижения. Следующий уровень открывается, когда вы готовы.' },
]

const AUDIENCE = [
  { title: 'Школьникам', text: 'Развивают внимание и умение рассуждать — пригодится на олимпиадах и экзаменах. Начинайте с «Разминки».' },
  { title: 'Студентам и взрослым', text: 'Стратегия и анализ данных пригодятся в учёбе и работе, а эмоциональное мышление — в общении. 10–15 минут в день достаточно, чтобы видеть рост.' },
  { title: 'Перед тестами и собеседованиями', text: 'Ряды, матрицы, силлогизмы, проценты, таблицы и вероятности — типичные задания логических, аналитических и IQ-тестов.' },
]

const FAQ = [
  {
    q: 'Нужна ли регистрация?',
    a: isCloudConfigured
      ? 'Нет — начать можно сразу. Но с аккаунтом прогресс хранится в облаке: войдите с одним email на компьютере и на телефоне, и решённые задачи, опыт и серия дней будут везде одинаковыми. То, что вы решили до входа, добавится в аккаунт.'
      : 'Нет. Прогресс автоматически сохраняется в вашем браузере. В разделе «Прогресс» его можно выгрузить в файл и загрузить на другом устройстве.',
  },
  {
    q: 'Какие направления есть в курсе?',
    a: 'Четыре: логическое мышление (ряды, выводы, головоломки), стратегическое (игры на выигрыш, планирование, выгодные решения, ходы наперёд), аналитическое (таблицы, проценты, вероятность, средние) и эмоциональное (словарь эмоций, распознавание чувств, управление эмоциями, эмпатия). Устроены они одинаково: теория, пять уровней, подсказки и разборы.',
  },
  { q: 'С какого уровня начинать?', a: 'Пройдите тест уровня — у каждого направления свой, и он откроет подходящие уровни во всех темах этого направления. Или начните с «Разминки»: следующий уровень темы открывается, когда вы решите половину задач предыдущего.' },
  { q: 'Что делать, если задача не получается?', a: 'Нажмите «Подсказка» — она направит, но не выдаст ответ. Если и это не помогло, откройте разбор: решение объяснено по шагам.' },
  { q: 'Как начисляется опыт?', a: 'За задачу с первой попытки без подсказки — полный опыт уровня (от 10 до 60 XP), иначе — половина. Если открыть решение, опыт не начисляется.' },
  {
    q: 'А если задачи закончатся?',
    a: 'Не закончатся. Кроме задач курса есть режим «Новые задачи»: сайт сам создаёт задачи по темам всех направлений (кроме «Нестандартных задач») и проверяет, что каждая новая не повторяет ни уже показанные, ни задачи курса. Уровень вы выбираете сами. У каждой новой задачи тоже есть подсказка и разбор. В эмоциональном направлении ситуации написаны вручную, поэтому новых вариантов там меньше.',
  },
  { q: 'Сколько времени заниматься?', a: 'Лучше понемногу, но каждый день: 5–10 задач в день и «Задача дня» дадут заметный результат уже через пару недель.' },
]

export function Landing() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <>
      {/* Первый экран */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -right-24 top-40 h-72 w-72 animate-float rounded-full bg-lvl4/10 blur-3xl" />
          <div className="absolute -left-24 bottom-0 h-64 w-64 animate-float rounded-full bg-lvl2/10 blur-3xl" style={{ animationDelay: '-3s' }} />
          {GLYPHS.map((g) => (
            <span
              key={g.text}
              className={`absolute hidden animate-float select-none font-display font-semibold sm:block ${g.className}`}
              style={{ '--r': g.r, animationDelay: `-${g.d}s`, animationDuration: `${g.t}s` } as CSSProperties}
              aria-hidden="true"
            >
              {g.text}
            </span>
          ))}
        </div>
        <Page className="grid items-center gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24">
          <div>
            <span className="chip animate-fade-up">
              <Sparkles size={13} className="animate-flicker text-accent" /> Онлайн-курс развития мышления
            </span>
            <h1 className="h-display mt-5 animate-fade-up text-[34px] leading-[1.1] sm:text-5xl lg:text-[56px]" style={delay(1, 90)}>
              Прокачайте мышление{' '}
              <span className="bg-gradient-to-r from-[#5B4BFF] via-[#B05CF5] to-[#5B4BFF] bg-[length:200%_auto] bg-clip-text text-transparent animate-shine">
                шаг за шагом
              </span>
            </h1>
            <p className="mt-5 max-w-xl animate-fade-up text-lg leading-relaxed text-muted" style={delay(2, 90)}>
              <b className="font-semibold text-ink">Logic progression ayno</b> — {TASKS.length} задач в четырёх направлениях: логическое, стратегическое, аналитическое и
              эмоциональное мышление. Пять уровней сложности — от разминки до олимпиадных задач, а когда задачи курса закончатся, сайт будет создавать новые без повторов.
              Теория, подсказки, пошаговые разборы и прогресс, который видно.
            </p>
            <div className="mt-8 flex animate-fade-up flex-wrap gap-3" style={delay(3, 90)}>
              <Link to="/course" className="btn-primary group px-6 py-3 text-base shadow-lift">
                Начать курс <ArrowRight size={18} className="transition group-hover:translate-x-1" />
              </Link>
              <Link to="/course" className="btn-ghost px-6 py-3 text-base">
                Выбрать направление
              </Link>
            </div>
            <p className="mt-4 animate-fade-up text-sm text-faint" style={delay(4, 90)}>
              {isCloudConfigured ? 'Можно без регистрации · с аккаунтом прогресс доступен на телефоне и компьютере' : 'Без регистрации · прогресс сохраняется в браузере'}
            </p>
          </div>
          <div className="animate-fade-up lg:pl-4" style={delay(3, 90)}>
            <p className="mb-3 text-sm font-semibold text-muted">Попробуйте прямо сейчас ↓</p>
            <TaskCard task={DEMO} mode="demo" />
          </div>
        </Page>
      </section>

      {/* Цифры */}
      <section className="border-y border-line bg-surface">
        <Page className="grid grid-cols-2 gap-y-6 py-8 sm:grid-cols-4">
          {(
            [
              [TOTAL_ROUNDED, '+', 'задач с разборами'],
              [4, '', 'направления мышления'],
              [MODULES.length, '', 'тем с теорией'],
              [null, '∞', 'новых задач без повторов'],
            ] as const
          ).map(([value, suffix, label]) => (
            <div key={label} className="text-center">
              <div className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                {value === null ? <InfinityMark /> : <CountUp value={value} suffix={suffix} duration={1400} />}
              </div>
              <div className="mt-1 text-sm text-muted">{label}</div>
            </div>
          ))}
        </Page>
      </section>

      {/* Как устроен курс */}
      <Page className="py-20">
        <Reveal>
          <SectionTitle eyebrow="Как это работает" title="Четыре шага к сильной логике" subtitle="Курс подстраивается под ваш уровень: сложность растёт вместе с вами." />
        </Reveal>
        <Cascade className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(shown) => STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className={`card group p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${riseOn(shown)}`} style={delay(i, 90)}>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Icon size={21} />
                </span>
                <span className="font-display text-sm font-semibold text-faint">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </Cascade>
      </Page>

      {/* Программа */}
      <section id="program" className="bg-surface-2/60 py-20">
        <Page>
          <Reveal>
            <SectionTitle
              eyebrow="Программа курса"
              title="Четыре направления мышления"
              subtitle={`${MODULES.length} тем и ${TASKS.length} задач. Суть везде одна: короткая теория, задачи пяти уровней с подсказками и разборами, опыт и прогресс. Меняется то, что вы тренируете.`}
            />
          </Reveal>
          <Cascade className="mt-10 grid gap-4 md:grid-cols-2">
            {(shown) =>
              CATEGORIES.map((c, i) => {
                const mods = modulesOf(c.id)
                const count = mods.reduce((n, m) => n + tasksOf(m.id).length, 0)
                return (
                  <div key={c.id} className={`card flex flex-col p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${riseOn(shown)}`} style={delay(i, 110)}>
                    <div className="flex items-start gap-4">
                      <CategoryIcon id={c.id} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{c.description}</p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {mods.map((m) => (
                        <Link key={m.id} to={`/module/${m.id}`} className="chip transition hover:-translate-y-0.5 hover:text-ink">
                          {m.title}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                      <span className="text-xs font-semibold text-faint">
                        {mods.length} {plural(mods.length, 'тема', 'темы', 'тем')} · {count} задач
                      </span>
                      <Link to={`/c/${c.id}`} className={`group inline-flex items-center gap-1 text-sm font-bold ${c.text}`}>
                        Открыть <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                )
              })
            }
          </Cascade>
        </Page>
      </section>

      {/* Уровни */}
      <Page className="py-20">
        <div id="levels" className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <SectionTitle
              eyebrow="Уровни сложности"
              title="Задачи для любого уровня подготовки"
              subtitle="Пять ступеней — от простых закономерностей до олимпиадных задач. Начните с комфортного уровня: следующий откроется, когда будете готовы."
            />
          </Reveal>
          <Cascade className="space-y-3">
            {(shown) => LEVELS.map((l, i) => (
              <div key={l.id} className={`card flex items-center gap-4 p-4 transition duration-300 hover:translate-x-1 hover:shadow-lift sm:p-5 ${riseOn(shown)}`} style={delay(i, 90)}>
                <div className="flex h-14 w-14 shrink-0 items-end justify-center gap-1 rounded-xl bg-surface-2 pb-3">
                  <LevelBars level={l.id} className={`${l.text} scale-[1.6]`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-bold">
                      {l.id}. {l.name}
                    </h3>
                    <span className={`rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold ${l.text}`}>{l.tag}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{l.description}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="font-display text-lg font-semibold">{tasksOfLevel(l.id).length}</div>
                  <div className="text-xs text-muted">задач</div>
                </div>
              </div>
            ))}
          </Cascade>
        </div>
      </Page>

      {/* Для кого */}
      <section className="bg-surface-2/60 py-20">
        <Page>
          <Reveal>
            <SectionTitle eyebrow="Для кого" title="Кому подойдёт курс" center />
          </Reveal>
          <Cascade className="mt-10 grid gap-4 md:grid-cols-3">
            {(shown) => AUDIENCE.map((a, i) => (
              <div key={a.title} className={`card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-lift ${riseOn(shown)}`} style={delay(i, 110)}>
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a.text}</p>
              </div>
            ))}
          </Cascade>
        </Page>
      </section>

      {/* Вопросы */}
      <Page className="py-20">
        <div id="faq" className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <SectionTitle eyebrow="Вопросы" title="Частые вопросы" subtitle="Не нашли ответ? Просто начните — первые задачи займут пару минут." />
          </Reveal>
          <Reveal className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" wait={120}>
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold transition hover:bg-surface-2/60"
                  aria-expanded={open === i}
                >
                  {f.q}
                  <ChevronDown size={18} className={`shrink-0 text-muted transition duration-300 ${open === i ? 'rotate-180 text-accent' : ''}`} />
                </button>
                {open === i && <p className="animate-rise px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>}
              </div>
            ))}
          </Reveal>
        </div>
      </Page>

      {/* Призыв */}
      <Page>
        <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B4BFF] to-[#9A4DF0] px-6 py-12 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 animate-float rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 animate-float rounded-full bg-white/10 blur-2xl" style={{ animationDelay: '-3.5s' }} />
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Первая задача — через 10 секунд</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Регистрация не нужна: откройте курс и решите первую задачу прямо сейчас.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/course" className="btn group bg-white px-6 py-3 text-base text-[#2a1f8f] hover:bg-white/90">
              Начать курс <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <Link to="/c/logic/test" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
              Пройти тест уровня
            </Link>
          </div>
        </Reveal>
      </Page>
    </>
  )
}

/** Знак бесконечности, который «прорисовывается» при появлении. */
function InfinityMark() {
  const [ref, shown] = useReveal<HTMLSpanElement>()
  return (
    <span ref={ref} className={`inline-block ${shown ? 'animate-pop-in' : 'opacity-0'}`}>
      ∞
    </span>
  )
}
