const DOTS = [
  [7.5, 22.5, 2.3],
  [13, 16.5, 2.3],
  [17.5, 19, 2.3],
  [24.5, 9.5, 3.1],
]

export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lpa-g" x1="0" y1="32" x2="32" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B4BFF" />
          <stop offset="1" stopColor="#B05CF5" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#lpa-g)" />
      {/* Линия «рисуется», точки появляются по очереди — как растущий прогресс. */}
      <path
        d="M7.5 22.5 L13 16.5 L17.5 19 L24.5 9.5"
        pathLength={40}
        strokeDasharray={40}
        className="animate-draw"
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {DOTS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#fff" className="origin-center animate-pop-in [transform-box:fill-box]" style={{ animationDelay: `${120 + i * 180}ms` }} />
      ))}
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="group flex min-w-0 items-center gap-2.5">
      <LogoMark size={compact ? 28 : 32} className="shrink-0 transition duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      <span className="truncate font-display text-[13px] font-semibold leading-none tracking-tight text-ink min-[420px]:text-[15px]">
        Logic progression <span className="text-accent">ayno</span>
      </span>
    </span>
  )
}
