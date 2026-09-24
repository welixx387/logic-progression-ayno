import { ArrowRight, BookOpen, ChartColumn, ChevronDown, Gauge, Sparkles, Target } from 'lucide-react'
import { useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { LevelBars, ModuleIcon, Page, SectionTitle } from '../components/ui'
import { LEVELS } from '../content/levels'
import { MODULES } from '../content/modules'
import { TASKS, TOTAL_ROUNDED, tasksOf, tasksOfLevel } from '../lib/catalog'
import { Link } from '../lib/router'
import { isCloudConfigured } from '../lib/supabase'
import type { Task } from '../types'

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

const STEPS = [
  { icon: Gauge, title: 'Тест уровня', text: '15 задач за 10–15 минут покажут, с какого уровня вам начинать, и сразу откроют подходящие задания.' },
  { icon: BookOpen, title: 'Короткая теория', text: 'В каждой теме — главные приёмы и разобранный пример. Никакой воды: только то, что помогает решать.' },
  { icon: Target, title: 'Практика с разбором', text: 'Подсказка, если застряли, и подробное решение после ответа. Ошибка — тоже часть обучения.' },
  { icon: ChartColumn, title: 'Видимый прогресс', text: 'Опыт, ранги, серия дней и достижения. Следующий уровень открывается, когда вы готовы.' },
]

const AUDIENCE = [
  { title: 'Школьникам', text: 'Развивают внимание и умение рассуждать — пригодится на олимпиадах и экзаменах. Начинайте с «Разминки».' },
  { title: 'Студентам и взрослым', text: 'Держат ум в тонусе и учат замечать закономерности. 10–15 минут в день достаточно, чтобы видеть рост.' },
  { title: 'Перед тестами и собеседованиями', text: 'Числовые ряды, матрицы, силлогизмы и аналогии — типичные задания логических и IQ-тестов.' },
]

const FAQ = [
  {
    q: 'Нужна ли регистрация?',
    a: isCloudConfigured
      ? 'Нет — начать можно сразу. Но с аккаунтом прогресс хранится в облаке: войдите с одним email на компьютере и на телефоне, и решённые задачи, опыт и серия дней будут везде одинаковыми. То, что вы решили до входа, добавится в аккаунт.'
      : 'Нет. Прогресс автоматически сохраняется в вашем браузере. В разделе «Прогресс» его можно выгрузить в файл и загрузить на другом устройстве.',
  },
  { q: 'С какого уровня начинать?', a: 'Пройдите тест уровня — он откроет подходящие уровни во всех темах. Или начните с «Разминки»: следующий уровень темы открывается, когда вы решите половину задач предыдущего.' },
  { q: 'Что делать, если задача не получается?', a: 'Нажмите «Подсказка» — она направит, но не выдаст ответ. Если и это не помогло, откройте разбор: решение объяснено по шагам.' },
  { q: 'Как начисляется опыт?', a: 'За задачу с первой попытки без подсказки — полный опыт уровня (от 10 до 60 XP), иначе — половина. Если открыть решение, опыт не начисляется.' },
  {
    q: 'А если задачи закончатся?',
    a: 'Не закончатся. Кроме задач курса есть режим «Новые задачи»: сайт сам создаёт задачи по всем темам, кроме «Нестандартных», и проверяет, что каждая новая не повторяет ни уже показанные, ни задачи курса. У каждой новой задачи тоже есть подсказка и разбор.',
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
        </div>
        <Page className="grid items-center gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24">
          <div className="animate-rise">
            <span className="chip">
              <Sparkles size={13} className="text-accent" /> Онлайн-курс логического мышления
            </span>
            <h1 className="h-display mt-5 text-[34px] leading-[1.1] sm:text-5xl lg:text-[56px]">
              Прокачайте логику <span className="text-accent">шаг за шагом</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              <b className="font-semibold text-ink">Logic progression ayno</b> — {TASKS.length} задач в {MODULES.length} темах и на 5 уровнях сложности: от разминки для школьников до
              олимпиадных головоломок. А когда задачи курса закончатся, сайт будет создавать новые — без повторов. Теория, подсказки, пошаговые разборы и прогресс, который видно.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/course" className="btn-primary px-6 py-3 text-base">
                Начать курс <ArrowRight size={18} />
              </Link>
              <Link to="/test" className="btn-ghost px-6 py-3 text-base">
                Определить свой уровень
              </Link>
            </div>
            <p className="mt-4 text-sm text-faint">
              {isCloudConfigured ? 'Можно без регистрации · с аккаунтом прогресс доступен на телефоне и компьютере' : 'Без регистрации · прогресс сохраняется в браузере'}
            </p>
          </div>
          <div className="animate-rise lg:pl-4">
            <p className="mb-3 text-sm font-semibold text-muted">Попробуйте прямо сейчас ↓</p>
            <TaskCard task={DEMO} mode="demo" />
          </div>
        </Page>
      </section>

      {/* Цифры */}
      <section className="border-y border-line bg-surface">
        <Page className="grid grid-cols-2 gap-y-6 py-8 sm:grid-cols-4">
          {[
            [`${TOTAL_ROUNDED}+`, 'задач с разборами'],
            [String(MODULES.length), 'тем логики'],
            ['5', 'уровней сложности'],
            ['∞', 'новых задач без повторов'],
          ].map(([value, label]) => (
            <div key={label} className="text-center">
              <div className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{value}</div>
              <div className="mt-1 text-sm text-muted">{label}</div>
            </div>
          ))}
        </Page>
      </section>

      {/* Как устроен курс */}
      <Page className="py-20">
        <SectionTitle eyebrow="Как это работает" title="Четыре шага к сильной логике" subtitle="Курс подстраивается под ваш уровень: сложность растёт вместе с вами." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={21} />
                </span>
                <span className="font-display text-sm font-semibold text-faint">0{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Page>

      {/* Программа */}
      <section id="program" className="bg-surface-2/60 py-20">
        <Page>
          <SectionTitle eyebrow="Программа курса" title={`${MODULES.length} тем — от рядов чисел до задач Эйнштейна`} subtitle="В каждой теме задания всех пяти уровней, короткая теория и разобранный пример." />
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m) => (
              <Link key={m.id} to={`/module/${m.id}`} className="card group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-lift">
                <ModuleIcon id={m.id} />
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold">{m.title}</h3>
                    <span className="shrink-0 text-xs font-semibold text-faint">{tasksOf(m.id).length} задач</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{m.short}</p>
                </div>
              </Link>
            ))}
          </div>
        </Page>
      </section>

      {/* Уровни */}
      <Page className="py-20">
        <div id="levels" className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionTitle
            eyebrow="Уровни сложности"
            title="Задачи для любого уровня подготовки"
            subtitle="Пять ступеней — от простых закономерностей до олимпиадных задач. Начните с комфортного уровня: следующий откроется, когда будете готовы."
          />
          <div className="space-y-3">
            {LEVELS.map((l) => (
              <div key={l.id} className="card flex items-center gap-4 p-4 sm:p-5">
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
          </div>
        </div>
      </Page>

      {/* Для кого */}
      <section className="bg-surface-2/60 py-20">
        <Page>
          <SectionTitle eyebrow="Для кого" title="Кому подойдёт курс" center />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="card p-6">
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a.text}</p>
              </div>
            ))}
          </div>
        </Page>
      </section>

      {/* Вопросы */}
      <Page className="py-20">
        <div id="faq" className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionTitle eyebrow="Вопросы" title="Частые вопросы" subtitle="Не нашли ответ? Просто начните — первые задачи займут пару минут." />
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {FAQ.map((f, i) => (
              <div key={f.q}>
                <button
                  type="button"
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold"
                  aria-expanded={open === i}
                >
                  {f.q}
                  <ChevronDown size={18} className={`shrink-0 text-muted transition ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && <p className="animate-rise px-5 pb-5 text-sm leading-relaxed text-muted">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </Page>

      {/* Призыв */}
      <Page>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5B4BFF] to-[#9A4DF0] px-6 py-12 text-center text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Первая задача — через 10 секунд</h2>
          <p className="mx-auto mt-3 max-w-xl opacity-90">Регистрация не нужна: откройте курс и решите первую задачу прямо сейчас.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/course" className="btn bg-white px-6 py-3 text-base text-[#2a1f8f] hover:bg-white/90">
              Начать курс <ArrowRight size={18} />
            </Link>
            <Link to="/test" className="btn border border-white/40 px-6 py-3 text-base text-white hover:bg-white/10">
              Пройти тест уровня
            </Link>
          </div>
        </div>
      </Page>
    </>
  )
}
