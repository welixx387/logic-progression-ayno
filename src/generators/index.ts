import type { ModuleId } from '../types.ts'
import { analogiesGenerator } from './analogies.ts'
import { combinatoricsGenerator } from './combinatorics.ts'
import { knightsGenerator } from './knights.ts'
import { lettersGenerator } from './letters.ts'
import { matricesGenerator } from './matrices.ts'
import { oddGenerator } from './odd.ts'
import { orderGenerator } from './order.ts'
import { sequencesGenerator } from './sequences.ts'
import { syllogismsGenerator } from './syllogisms.ts'
import { symbolsGenerator } from './symbols.ts'
import { timeGenerator } from './time.ts'
import type { ModuleGenerator } from './util.ts'
import { gamesGenerator } from './games.ts'
import { planningGenerator } from './planning.ts'
import { decisionsGenerator } from './decisions.ts'
import { opponentGenerator } from './opponent.ts'
import { tablesGenerator } from './tables.ts'
import { percentGenerator } from './percent.ts'
import { probabilityGenerator } from './probability.ts'
import { statsGenerator } from './stats.ts'
import { emotionsGenerator } from './emotions.ts'
import { recognizeGenerator } from './recognize.ts'
import { regulationGenerator } from './regulation.ts'
import { empathyGenerator } from './empathy.ts'
import { zebraGenerator } from './zebra.ts'

/** Все темы, задания которых создаются программой. «Нестандартные задачи» написаны вручную. */
export const GENERATORS: Partial<Record<ModuleId, ModuleGenerator>> = {
  sequences: sequencesGenerator,
  letters: lettersGenerator,
  odd: oddGenerator,
  analogies: analogiesGenerator,
  syllogisms: syllogismsGenerator,
  order: orderGenerator,
  knights: knightsGenerator,
  symbols: symbolsGenerator,
  matrices: matricesGenerator,
  time: timeGenerator,
  combinatorics: combinatoricsGenerator,
  zebra: zebraGenerator,
  games: gamesGenerator,
  planning: planningGenerator,
  decisions: decisionsGenerator,
  opponent: opponentGenerator,
  tables: tablesGenerator,
  percent: percentGenerator,
  probability: probabilityGenerator,
  stats: statsGenerator,
  emotions: emotionsGenerator,
  recognize: recognizeGenerator,
  regulation: regulationGenerator,
  empathy: empathyGenerator,
}

export const GENERATED_MODULES = Object.keys(GENERATORS) as ModuleId[]
