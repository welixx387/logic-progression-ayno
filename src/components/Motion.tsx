import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'

/** Человек попросил систему уменьшить движение — тогда анимации не проигрываем. */
export const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Возвращает true, когда элемент впервые показался на экране. Дальше значение
 * не меняется: однажды появившийся блок остаётся на месте.
 */
export function useReveal<T extends Element>(): [RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined' || reducedMotion())
  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])
  return [ref, shown]
}

/** Класс для элемента, который плавно поднимается при появлении на экране. */
export const riseOn = (shown: boolean) => (shown ? 'animate-fade-up' : 'opacity-0')

/** Задержка для каскадного появления: каждый следующий элемент чуть позже. */
export const delay = (i: number, step = 60): CSSProperties => ({ animationDelay: `${i * step}ms` })

/** Блок, который плавно появляется, когда до него докрутили. */
export function Reveal({ children, className = '', wait = 0 }: { children: ReactNode; className?: string; wait?: number }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={`${riseOn(shown)} ${className}`} style={{ animationDelay: `${wait}ms` }}>
      {children}
    </div>
  )
}

/** Группа карточек, которые появляются по очереди, когда до них докрутили. */
export function Cascade({ className, children }: { className: string; children: (shown: boolean) => ReactNode }) {
  const [ref, shown] = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={className}>
      {children(shown)}
    </div>
  )
}

/** Плавно «докручивает» число до нового значения. */
export function useCountUp(target: number, { duration = 900, from = 0 }: { duration?: number; from?: number } = {}) {
  const [value, setValue] = useState(() => (reducedMotion() ? target : from))
  const current = useRef(value)
  useEffect(() => {
    if (reducedMotion() || current.current === target) {
      current.current = target
      setValue(target)
      return
    }
    const start = performance.now()
    const a = current.current
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const v = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)))
      current.current = v
      setValue(v)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

/** Число, которое отсчитывается от нуля, когда появляется на экране. */
export function CountUp({ value, suffix = '', duration }: { value: number; suffix?: string; duration?: number }) {
  const [ref, shown] = useReveal<HTMLSpanElement>()
  const n = useCountUp(shown ? value : 0, { duration })
  return (
    <span ref={ref} className="tabular-nums">
      {n}
      {suffix}
    </span>
  )
}

/** false на первом кадре, затем true — чтобы полосы «вырастали» из нуля. */
export function useAfterMount(wait = 60) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), wait)
    return () => clearTimeout(t)
  }, [wait])
  return ready
}

const BURST_COLORS = ['bg-accent', 'bg-good', 'bg-warn', 'bg-lvl1', 'bg-lvl3', 'bg-lvl4', 'bg-lvl5']

/** Разлетающиеся конфетти — празднуем верный ответ. */
export function Burst({ count = 16, spread = 70 }: { count?: number; spread?: number }) {
  if (reducedMotion()) return null
  return (
    <span className="pointer-events-none absolute left-1/2 top-1/2 z-10" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.25
        const dist = spread * (0.6 + ((i * 37) % 10) / 22)
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * dist)}px`,
          '--dy': `${Math.round(Math.sin(angle) * dist - 12)}px`,
          '--rot': `${(i % 2 ? 1 : -1) * (90 + i * 25)}deg`,
          animationDelay: `${(i % 4) * 25}ms`,
        } as CSSProperties
        const shape = i % 3 === 0 ? 'h-2 w-2 rounded-full' : i % 3 === 1 ? 'h-1.5 w-2.5 rounded-sm' : 'h-2 w-2 rotate-45 rounded-[2px]'
        return <span key={i} className={`absolute -ml-1 -mt-1 animate-burst ${shape} ${BURST_COLORS[i % BURST_COLORS.length]}`} style={style} />
      })}
    </span>
  )
}
