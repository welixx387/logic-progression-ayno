import {
  Activity,
  Anchor,
  ArrowLeftRight,
  ArrowUpDown,
  Atom,
  Ban,
  Binary,
  BookHeart,
  BookOpen,
  BookOpenText,
  Box,
  Boxes,
  Brain,
  Cake,
  Calculator,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CaseSensitive,
  Castle,
  ChartColumn,
  ChartGantt,
  ChartLine,
  ChartNoAxesCombined,
  ChartPie,
  ChartScatter,
  ChartSpline,
  ChessKnight,
  CircleDashed,
  CirclePause,
  Clock,
  CloudSun,
  Coins,
  Compass,
  ContactRound,
  Cpu,
  Croissant,
  Crosshair,
  Dices,
  Dna,
  DoorOpen,
  Drama,
  Dumbbell,
  Ear,
  Fence,
  Filter,
  Flame,
  FlaskConical,
  Gauge,
  Gavel,
  Gem,
  GitBranch,
  GitFork,
  GlassWater,
  Glasses,
  Globe,
  GraduationCap,
  Grid2x2,
  Grid3x3,
  Grip,
  Group,
  HandHeart,
  HandHelping,
  Handshake,
  Hash,
  Heart,
  HeartCrack,
  HeartHandshake,
  HeartPulse,
  IdCard,
  KeyRound,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  Link,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  LockKeyhole,
  Map,
  MessageSquare,
  Music,
  Network,
  OctagonX,
  Palette,
  PenLine,
  Percent,
  PersonStanding,
  Pi,
  PiggyBank,
  Puzzle,
  Ratio,
  Replace,
  Ruler,
  Scale,
  Search,
  Shapes,
  Sheet,
  Shield,
  ShieldPlus,
  ShoppingCart,
  Shuffle,
  Sigma,
  Signpost,
  SlidersHorizontal,
  Sofa,
  Split,
  Sprout,
  SquareFunction,
  Star,
  Sun,
  Swords,
  Table,
  Table2,
  Tag,
  Tags,
  Target,
  Telescope,
  ToggleLeft,
  TrendingUp,
  Triangle,
  TriangleAlert,
  Undo2,
  Users,
  UsersRound,
  Vote,
  Wallet,
  Warehouse,
  Waypoints,
  Weight,
  Wind,
  Workflow,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { CATEGORY_BY_ID } from '../content/categories'
import { LEVELS, levelInfo, levelLabel } from '../content/levels'
import { MODULE_BY_ID } from '../content/modules'
import type { CategoryId, Level, ModuleId } from '../types'
import { useAfterMount } from './Motion'

export const MODULE_ICONS: Record<ModuleId, LucideIcon> = {
  sequences: TrendingUp,
  letters: CaseSensitive,
  odd: Shapes,
  analogies: ArrowLeftRight,
  syllogisms: Workflow,
  order: ArrowUpDown,
  knights: Swords,
  symbols: Calculator,
  matrices: Grid3x3,
  time: Clock,
  combinatorics: Dices,
  zebra: Table2,
  classic: Lightbulb,
  games: Coins,
  planning: ChartGantt,
  decisions: Scale,
  opponent: ChessKnight,
  tables: Sheet,
  percent: Percent,
  probability: Target,
  stats: ChartColumn,
  emotions: BookHeart,
  recognize: Drama,
  regulation: Wind,
  empathy: HandHeart,
  algebra: Pi,
  geometry: Triangle,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  informatics: Binary,
  russian: PenLine,
  literature: BookOpenText,
  english: Languages,
  history: Landmark,
  social: Users,
  geography: Globe,
  safety: ShieldPlus,
  digits: Hash,
  backward: Undo2,
  chunking: Group,
  numgrid: Grid2x2,
  workmem: Cpu,
  flats: DoorOpen,
  codes: KeyRound,
  years: CalendarClock,
  wordlist: List,
  wordorder: ListOrdered,
  chain: Link2,
  pairs: Link,
  names: ContactRound,
  colors: Palette,
  changes: Replace,
  signs: Star,
  shopping: ShoppingCart,
  route: Signpost,
  schedule: CalendarDays,
  story: BookOpen,
  scene: Sofa,
  cards: IdCard,
  citymap: Map,
  dots: Grip,
  conditionals: Split,
  negation: Ban,
  euler: CircleDashed,
  pigeonhole: Boxes,
  parity: ToggleLeft,
  weighing: Scale,
  pouring: GlassWater,
  ciphers: LockKeyhole,
  rebus: SquareFunction,
  magic: Sigma,
  cubes: Box,
  graphs: Network,
  trends: ChartLine,
  growth: ChartNoAxesCombined,
  proportion: Ratio,
  pie: ChartPie,
  pivot: Table,
  timeseries: CalendarRange,
  estimates: Ruler,
  spread: SlidersHorizontal,
  normal: ChartSpline,
  weighted: Weight,
  bayes: GitFork,
  expected: Gem,
  correlation: ChartScatter,
  simpson: Shuffle,
  sampling: Users,
  funnel: Filter,
  abtest: Split,
  loans: Landmark,
  deals: Tags,
  scoring: ListChecks,
  fallacies: TriangleAlert,
  priorities: ListOrdered,
  smart: Crosshair,
  swot: Grid2x2,
  assignment: Users,
  scheduling: ListChecks,
  routing: Waypoints,
  inventory: Warehouse,
  uncertainty: CloudSun,
  dtree: GitBranch,
  opportunity: Scale,
  compound: PiggyBank,
  pricing: Tag,
  biases: Anchor,
  search: Search,
  stopping: OctagonX,
  voting: Vote,
  fairdiv: Cake,
  negotiation: Handshake,
  auctions: Gavel,
  cooperation: HeartHandshake,
  tictactoe: Grid3x3,
  distortions: Glasses,
  bodysignals: HeartPulse,
  needs: HandHeart,
  functions: Lightbulb,
  stress: Gauge,
  halt: CirclePause,
  mindset: Sprout,
  explanatory: Compass,
  motivation: Flame,
  values: Gem,
  wellbeing: Sun,
  conflict: Swords,
  defenses: Shield,
  assertive: MessageSquare,
  listening: Ear,
  boundaries: Fence,
  manipulation: Drama,
  apology: HandHelping,
  toxic: HeartCrack,
  nonverbal: PersonStanding,
  teamroles: UsersRound,
  probstat: Dices,
  astronomy: Telescope,
  ecology: Leaf,
  finance: Wallet,
  pe: Dumbbell,
  german: Castle,
  french: Croissant,
  technology: Wrench,
  music: Music,
  art: Palette,
}

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  logic: Puzzle,
  strategy: Compass,
  analytics: Activity,
  emotional: Heart,
  memory: Brain,
  academic: GraduationCap,
}

/** Значок направления в цветной плашке. */
export function CategoryIcon({ id, size = 'md' }: { id: CategoryId; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = CATEGORY_ICONS[id]
  const c = CATEGORY_BY_ID[id]
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl'
  const icon = size === 'lg' ? 26 : size === 'sm' ? 16 : 21
  return (
    <span className={`inline-flex shrink-0 items-center justify-center transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${c.soft} ${c.text} ${box}`}>
      <Icon size={icon} strokeWidth={2} />
    </span>
  )
}

export function ModuleIcon({ id, size = 'md' }: { id: ModuleId; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = MODULE_ICONS[id]
  const c = CATEGORY_BY_ID[MODULE_BY_ID[id].category]
  const box = size === 'lg' ? 'h-14 w-14 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-11 w-11 rounded-xl'
  const icon = size === 'lg' ? 26 : size === 'sm' ? 16 : 21
  return (
    <span className={`inline-flex shrink-0 items-center justify-center transition duration-300 group-hover:-rotate-6 group-hover:scale-110 ${c.soft} ${c.text} ${box}`}>
      <Icon size={icon} strokeWidth={2} />
    </span>
  )
}

export function ProgressBar({ value, max, className = '', color = 'bg-accent' }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  // Полоса «вырастает» из нуля при появлении страницы.
  const ready = useAfterMount()
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${color}`} style={{ width: `${ready ? pct : 0}%` }} />
    </div>
  )
}

/** Уровень задачи; в школьном направлении — класс («9 класс»). */
export function LevelBadge({ level, withName = true, grades = false }: { level: Level | number; withName?: boolean; grades?: boolean }) {
  const info = levelInfo(level)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold ${info.text}`}>
      <LevelBars level={info.id} />
      {grades ? levelLabel(info.id, true) : withName ? `Уровень ${info.id} · ${info.name}` : `Уровень ${info.id}`}
    </span>
  )
}

/** Пять столбиков-«ступенек», закрашенных до уровня. */
export function LevelBars({ level, className = '' }: { level: Level; className?: string }) {
  return (
    <span className={`inline-flex items-end gap-[2px] ${className}`} aria-hidden="true">
      {LEVELS.map((l) => (
        <span key={l.id} className={`w-[3px] rounded-sm ${l.id <= level ? 'bg-current' : 'bg-current opacity-25'}`} style={{ height: 4 + l.id * 2 }} />
      ))}
    </span>
  )
}

export function SectionTitle({ eyebrow, title, subtitle, center = false }: { eyebrow?: string; title: ReactNode; subtitle?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="h-display mt-2 text-2xl sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-muted">{subtitle}</p>}
    </div>
  )
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  )
}

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
}
