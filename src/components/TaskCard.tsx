import { CircleCheck, CircleX, Eye, Lightbulb, Zap } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { isCorrect } from '../lib/answer'
import { useProgress } from '../store/progress'
import type { Task } from '../types'
import { TaskDisplay } from './TaskDisplay'

const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е']
const PRAISE = ['Верно!', 'Отлично!', 'Точно!', 'Правильно!', 'Так держать!']

type Phase = 'answering' | 'wrong' | 'solved' | 'revealed'

interface Props {
  task: Task
  /** course — с записью прогресса; test — одна попытка без подсказок; demo — без записи. */
  mode?: 'course' | 'test' | 'demo'
  onResult?: (result: { correct: boolean; xp: number }) => void
  /** Что показать после решения (например, кнопку «Дальше»). */
  after?: ReactNode
  autoFocus?: boolean
}

export function TaskCard({ task, mode = 'course', onResult, after, autoFocus = false }: Props) {
  const record = useProgress((s) => s.records[task.id])
  const attempt = useProgress((s) => s.attempt)
  const markHint = useProgress((s) => s.markHint)
  const reveal = useProgress((s) => s.reveal)

  const alreadyDone = mode === 'course' && !!record && (record.solved || record.revealed)
  const [phase, setPhase] = useState<Phase>('answering')
  const [value, setValue] = useState('')
  const [wrongCount, setWrongCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [showSolution, setShowSolution] = useState(false)
  const [gained, setGained] = useState<number | null>(null)
  const [shake, setShake] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const finished = phase === 'solved' || phase === 'revealed'
  const praise = PRAISE[task.id.length % PRAISE.length]

  useEffect(() => {
    if (autoFocus && task.kind !== 'choice') inputRef.current?.focus()
  }, [autoFocus, task.kind])

  const check = () => {
    if (finished || !value.trim()) return
    const correct = isCorrect(task, value)
    if (mode === 'test') {
      onResult?.({ correct, xp: 0 })
      return
    }
    let xp = 0
    if (mode === 'course') xp = attempt(task, correct).xp
    if (correct) {
      setPhase('solved')
      setGained(xp)
      setShowSolution(true)
      onResult?.({ correct: true, xp })
    } else {
      setPhase('wrong')
      setWrongCount((n) => n + 1)
      setShake((n) => n + 1)
      if (task.kind !== 'choice') inputRef.current?.select()
    }
  }

  const openHint = () => {
    setShowHint(true)
    if (mode === 'course') markHint(task)
  }

  const giveUp = () => {
    if (mode === 'course') reveal(task)
    setPhase('revealed')
    setShowSolution(true)
    onResult?.({ correct: false, xp: 0 })
  }

  // Клавиши 1–6 выбирают вариант, Enter — проверяет.
  useEffect(() => {
    if (task.kind !== 'choice' || finished) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'Enter' && target.tagName !== 'BUTTON') {
        formRef.current?.requestSubmit()
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= (task.options?.length ?? 0)) {
        setValue(task.options![n - 1])
        setPhase('answering')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [task, finished])

  const optionClass = (opt: string) => {
    const selected = value === opt
    if (finished) {
      if (opt === task.answer) return 'border-good bg-good-soft text-ink'
      return 'border-line bg-surface opacity-60'
    }
    if (selected && phase === 'wrong') return 'border-bad bg-bad-soft'
    if (selected) return 'border-accent bg-accent-soft ring-2 ring-accent/20'
    return 'border-line bg-surface hover:border-accent/50 hover:bg-surface-2'
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-5 sm:p-7">
        <p className="whitespace-pre-line text-[16.5px] leading-relaxed text-ink sm:text-[17px]">{task.prompt}</p>
        {task.display && (
          <div className="mt-5 overflow-x-auto pb-1">
            <TaskDisplay display={task.display} />
          </div>
        )}

        {alreadyDone && phase === 'answering' && (
          <p className="mt-5 rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">
            {record?.solved ? 'Вы уже решили эту задачу — можно решить ещё раз для тренировки (опыт повторно не начисляется).' : 'Решение этой задачи уже открыто — попробуйте решить её самостоятельно.'}
          </p>
        )}

        <form
          ref={formRef}
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          {task.kind === 'choice' ? (
            <div key={shake} className={`grid gap-2.5 ${(task.options ?? []).some((o) => o.length > 34) ? '' : 'sm:grid-cols-2'} ${phase === 'wrong' ? 'animate-shake' : ''}`}>
              {task.options!.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  disabled={finished}
                  onClick={() => {
                    setValue(opt)
                    setPhase('answering')
                  }}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left text-[15px] font-medium transition ${optionClass(opt)}`}
                >
                  <span className="mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-bold text-muted">
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 break-words">{opt}</span>
                  {finished && opt === task.answer && <CircleCheck size={18} className="ml-auto mt-0.5 shrink-0 text-good" />}
                </button>
              ))}
            </div>
          ) : (
            <div key={shake} className={`flex gap-2.5 ${phase === 'wrong' ? 'animate-shake' : ''}`}>
              <input
                ref={inputRef}
                value={finished && phase === 'revealed' ? task.answer : value}
                onChange={(e) => {
                  setValue(e.target.value)
                  if (phase === 'wrong') setPhase('answering')
                }}
                disabled={finished}
                inputMode={task.kind === 'number' ? 'decimal' : 'text'}
                autoComplete="off"
                placeholder={task.kind === 'number' ? 'Ваш ответ — число' : 'Ваш ответ'}
                aria-label="Ответ"
                className={`min-w-0 flex-1 rounded-xl border bg-surface px-4 py-3 font-mono text-lg outline-none transition placeholder:font-sans placeholder:text-base placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 ${
                  phase === 'wrong' ? 'border-bad' : finished ? 'border-good bg-good-soft' : 'border-line'
                }`}
              />
            </div>
          )}

          {!finished && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="submit" className="btn-primary" disabled={!value.trim()}>
                {mode === 'test' ? 'Ответить' : 'Проверить'}
              </button>
              {mode === 'test' ? (
                <button type="button" className="btn-quiet" onClick={() => onResult?.({ correct: false, xp: 0 })}>
                  Не знаю
                </button>
              ) : (
                <>
                  {task.hint && !showHint && (
                    <button type="button" className="btn-quiet" onClick={openHint}>
                      <Lightbulb size={16} /> Подсказка
                    </button>
                  )}
                  {(wrongCount > 0 || showHint || alreadyDone) && (
                    <button type="button" className="btn-quiet" onClick={giveUp}>
                      <Eye size={16} /> Показать решение
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </form>

        {phase === 'wrong' && (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-bad" role="status">
            <CircleX size={18} /> Не совсем. Попробуйте ещё раз{wrongCount > 1 ? ` (попыток: ${wrongCount})` : ''}.
          </p>
        )}

        {showHint && task.hint && !finished && (
          <div className="mt-4 flex gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm leading-relaxed">
            <Lightbulb size={18} className="mt-0.5 shrink-0 text-warn" />
            <span>{task.hint}</span>
          </div>
        )}
      </div>

      {finished && (
        <div className={`animate-rise border-t px-5 py-5 sm:px-7 ${phase === 'solved' ? 'border-good/30 bg-good-soft/60' : 'border-line bg-surface-2'}`}>
          <div className="flex flex-wrap items-center gap-3">
            {phase === 'solved' ? (
              <p className="flex items-center gap-2 text-base font-bold text-good">
                <CircleCheck size={20} /> {praise}
              </p>
            ) : (
              <p className="text-base font-bold text-ink">
                Ответ: <span className="text-accent">{task.answer}</span>
              </p>
            )}
            {phase === 'solved' && mode === 'course' && gained !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-ink">
                <Zap size={13} className="text-warn" fill="currentColor" />
                {gained > 0 ? `+${gained} XP` : 'опыт уже получен'}
              </span>
            )}
          </div>
          {phase === 'solved' && gained !== null && gained > 0 && (wrongCount > 0 || showHint) && (
            <p className="mt-1 text-xs text-muted">Половина опыта — задача решена не с первой попытки или с подсказкой.</p>
          )}
          <button type="button" onClick={() => setShowSolution((v) => !v)} className="mt-3 text-sm font-semibold text-accent hover:underline">
            {showSolution ? 'Скрыть разбор' : 'Показать разбор'}
          </button>
          {showSolution && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-ink/90">{task.solution}</p>}
          {after && <div className="mt-5">{after}</div>}
        </div>
      )}
    </div>
  )
}
