import { CATEGORIES } from '../content/categories'
import type { CategoryId } from '../types'
import { CATEGORY_ICONS } from './ui'

/** Переключатель направлений: логика, стратегия, анализ, эмоции. */
export function CategoryTabs({ value, onChange, label = 'Направление' }: { value: CategoryId; onChange: (c: CategoryId) => void; label?: string }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 rounded-2xl border border-line bg-surface-2 p-1.5 sm:gap-2" role="tablist" aria-label={label}>
      {CATEGORIES.map((c) => {
        const Icon = CATEGORY_ICONS[c.id]
        const active = c.id === value
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c.id)}
            className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[12px] font-bold transition duration-200 active:scale-95 sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm ${
              active ? `bg-surface shadow-card ${c.text}` : 'text-muted hover:bg-surface/60 hover:text-ink'
            }`}
          >
            <Icon size={18} className={`shrink-0 transition-transform duration-300 ${active ? 'scale-110' : ''}`} />
            <span className="truncate">{c.tab}</span>
          </button>
        )
      })}
    </div>
  )
}
